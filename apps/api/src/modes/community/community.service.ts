import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../platform-events/event-bus.service';
import {
  CreateServerDto,
  CreateChannelDto,
  UpdateServerDto,
  CreateCommunityRoleDto,
  UpdateCommunityRoleDto,
  AssignMemberRoleDto,
} from './dto/community.dto';

type MemberFull = {
  id: string;
  serverId: string;
  userId: string;
  role: string;
  communityRoleId: string | null;
  mutedUntil: Date | null;
  communityRole: {
    id: string;
    name: string;
    color: string | null;
    canModerate: boolean;
    canManageServer: boolean;
    canManageChannels: boolean;
  } | null;
};

export type SavedMessagePayload = {
  messageType?: string;
  imageUrl?: string | null;
  embedJson?: object | null;
  replyToId?: string | null;
  attachmentUrls?: string[] | null;
  mentions?: { everyone?: boolean; userIds?: string[] } | null;
};

type MessageWithRels = Prisma.MessageGetPayload<{
  include: {
    reactions: true;
    replyTo: { select: { id: true; content: true; authorId: true; authorType: true; deletedAt: true } };
    pin: { select: { id: true } };
  };
}>;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  private async logAudit(serverId: string, actorId: string, action: string, targetId?: string | null, metadata?: Record<string, unknown>) {
    try {
      await this.prisma.communityAuditLog.create({
        data: {
          serverId,
          actorId,
          action,
          targetId: targetId ?? null,
          ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {}),
        },
      });
    } catch (e) {
      console.error('[community audit]', e);
    }
  }

  private async parseMentionsFromContent(content: string, serverId: string): Promise<Prisma.InputJsonValue | undefined> {
    const everyone = /\B@everyone\b/i.test(content);
    const re = /@([\w.]+)/g;
    const tags = [...content.matchAll(re)].map(m => m[1].toLowerCase());
    const uniqTags = [...new Set(tags)].filter(t => t !== 'everyone');
    if (!everyone && uniqTags.length === 0) return undefined;
    const members = await this.prisma.serverMember.findMany({ where: { serverId }, select: { userId: true } });
    const userIdsInServer = new Set(members.map(m => m.userId));
    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: [...userIdsInServer] } },
      select: { userId: true, username: true },
    });
    const byUsername = new Map(profiles.map(p => [p.username.toLowerCase(), p.userId]));
    const mentioned = [...new Set(uniqTags.map(t => byUsername.get(t)).filter(Boolean))] as string[];
    const out: { everyone?: boolean; userIds?: string[] } = {};
    if (everyone) out.everyone = true;
    if (mentioned.length) out.userIds = mentioned;
    return Object.keys(out).length ? out : undefined;
  }

  private async hydrateMessagesList(messages: MessageWithRels[]) {
    const humanIds = new Set<string>();
    const botIds = new Set<string>();
    for (const m of messages) {
      if (m.authorType === 'user') humanIds.add(m.authorId);
      else botIds.add(m.authorId);
      const rt = m.replyTo;
      if (rt && !rt.deletedAt) {
        if (rt.authorType === 'user') humanIds.add(rt.authorId);
        else botIds.add(rt.authorId);
      }
    }
    const [profiles, bots] = await Promise.all([
      this.prisma.profile.findMany({
        where: { userId: { in: [...humanIds] } },
        select: { userId: true, displayName: true, username: true, avatarUrl: true },
      }),
      this.prisma.bot.findMany({ where: { id: { in: [...botIds] } }, select: { id: true, name: true } }),
    ]);
    const pm = new Map(profiles.map(p => [p.userId, p]));
    const bm = new Map(bots.map(b => [b.id, b]));
    const nameOf = (authorId: string, authorType: string) => {
      if (authorType === 'user') {
        const p = pm.get(authorId);
        return p?.displayName ?? p?.username ?? 'Utilizador';
      }
      return bm.get(authorId)?.name ?? 'Bot';
    };
    const avatarOf = (authorId: string, authorType: string) =>
      authorType === 'user' ? (pm.get(authorId)?.avatarUrl ?? null) : null;

    return messages.map(msg => {
      const rt = msg.replyTo;
      return {
        ...msg,
        embedJson: msg.embedJson as object | null,
        attachmentUrls: (msg.attachmentUrls as string[] | null) ?? null,
        mentions: msg.mentions as { everyone?: boolean; userIds?: string[] } | null,
        authorName: nameOf(msg.authorId, msg.authorType),
        authorAvatarUrl: avatarOf(msg.authorId, msg.authorType),
        replyTo:
          rt && !rt.deletedAt
            ? {
                id: rt.id,
                content: rt.content.length > 220 ? `${rt.content.slice(0, 220)}…` : rt.content,
                authorName: nameOf(rt.authorId, rt.authorType),
              }
            : null,
        reactions: msg.reactions.map(r => ({ emoji: r.emoji, userId: r.userId })),
        pinned: !!msg.pin,
      };
    });
  }

  private async memberFull(serverId: string, userId: string): Promise<MemberFull | null> {
    const m = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { communityRole: true },
    });
    return m as MemberFull | null;
  }

  private async requireMemberFull(serverId: string, userId: string): Promise<MemberFull> {
    const m = await this.memberFull(serverId, userId);
    if (!m) throw new ForbiddenException('Não és membro deste servidor.');
    return m;
  }

  private isAdminLegacy(m: MemberFull) {
    return m.role === 'admin';
  }

  private canModerate(m: MemberFull) {
    return this.isAdminLegacy(m) || m.communityRole?.canModerate === true;
  }

  private canManageServerPerm(m: MemberFull) {
    return this.isAdminLegacy(m) || m.communityRole?.canManageServer === true;
  }

  private canManageChannelsPerm(m: MemberFull) {
    return this.isAdminLegacy(m) || m.communityRole?.canManageChannels === true;
  }

  async createServer(ownerId: string, dto: CreateServerDto) {
    const server = await this.prisma.server.create({
      data: {
        ownerId, name: dto.name, description: dto.description,
        channels: { create: { name: 'geral', type: 'text', position: 0 } },
        members:  { create: { userId: ownerId, role: 'admin' } },
      },
      include: { channels: true, _count: { select: { members: true } } },
    });
    this.eventBus.publish({ type: 'MEMBER_JOIN', serverId: server.id, userId: ownerId });
    return server;
  }

  /** O dono não pode sair sem transferir; use apenas para membros. */
  async leaveServer(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.deletedAt) throw new NotFoundException('Servidor não encontrado.');
    if (server.ownerId === userId) {
      throw new BadRequestException('O dono não pode sair do servidor sem transferir a propriedade.');
    }
    const m = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId } } });
    if (!m) throw new ForbiddenException('Não és membro deste servidor.');
    await this.prisma.serverMember.delete({ where: { id: m.id } });
    this.eventBus.publish({ type: 'MEMBER_LEAVE', serverId, userId, reason: 'leave' });
    return { ok: true };
  }

  async getMyServers(userId: string) {
    const rows = await this.prisma.serverMember.findMany({
      where: { userId },
      include: { server: { include: { channels: { orderBy: { position: 'asc' } }, _count: { select: { members: true } } } } },
    });
    return rows.map(r => ({ ...r.server, role: r.role, membersCount: r.server._count.members }));
  }

  async getServer(serverId: string, userId: string) {
    await this.requireMember(serverId, userId);
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: {
        channelCategories: { orderBy: { position: 'asc' } },
        channels: { orderBy: [{ categoryId: 'asc' }, { position: 'asc' }] },
        members:  { include: { communityRole: true } },
        bots: { include: { bot: { select: { id: true, name: true, prefix: true } } } },
        roles: { orderBy: { position: 'asc' } },
        _count: { select: { members: true } },
      },
    });
    if (!server || server.deletedAt) throw new NotFoundException('Servidor não encontrado.');
    const userIds = server.members.map(m => m.userId);
    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, username: true, displayName: true, avatarUrl: true },
    });
    const pm = new Map(profiles.map(p => [p.userId, p]));
    return {
      ...server,
      membersCount: server._count.members,
      members: server.members.map(m => ({
        ...m,
        profile: pm.get(m.userId) ?? null,
      })),
      bots: server.bots.map(sb => ({
        id: sb.id,
        isAdminBot: sb.isAdminBot,
        bot: sb.bot,
      })),
    };
  }

  async updateServer(serverId: string, actorId: string, dto: UpdateServerDto) {
    const m = await this.requireMemberFull(serverId, actorId);
    if (!this.isAdminLegacy(m) && !this.canManageServerPerm(m)) {
      throw new ForbiddenException('Sem permissão para editar o servidor.');
    }
    const data: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (Object.keys(data).length === 0) return this.prisma.server.findUniqueOrThrow({ where: { id: serverId } });
    const updated = await this.prisma.server.update({ where: { id: serverId }, data });
    await this.logAudit(serverId, actorId, 'server.update', serverId, data as Record<string, unknown>);
    return updated;
  }

  async joinByInvite(inviteCode: string, userId: string) {
    const server = await this.prisma.server.findUnique({ where: { inviteCode } });
    if (!server || server.deletedAt) throw new NotFoundException('Código de convite inválido.');
    const banned = await this.prisma.communityBan.findFirst({ where: { serverId: server.id, userId } });
    if (banned) throw new ForbiddenException('Foste banido deste servidor.');
    const existing = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: server.id, userId } } });
    if (!existing) {
      await this.prisma.serverMember.create({ data: { serverId: server.id, userId, role: 'member' } });
      this.eventBus.publish({ type: 'MEMBER_JOIN', serverId: server.id, userId });
    }
    return this.getServer(server.id, userId);
  }

  async createCategory(serverId: string, userId: string, dto: { name: string; position?: number }) {
    const member = await this.requireMemberFull(serverId, userId);
    if (!this.canManageChannelsPerm(member)) throw new ForbiddenException('Só quem gere canais pode criar categorias.');
    const pos = dto.position ?? (await this.prisma.channelCategory.count({ where: { serverId } }));
    const row = await this.prisma.channelCategory.create({
      data: { serverId, name: dto.name.trim(), position: pos },
    });
    await this.logAudit(serverId, userId, 'category.create', row.id, { name: row.name });
    return row;
  }

  async createChannel(serverId: string, userId: string, dto: CreateChannelDto) {
    const member = await this.requireMemberFull(serverId, userId);
    if (!this.canManageChannelsPerm(member)) throw new ForbiddenException('Só quem gere canais pode criar canais.');
    if (dto.categoryId) {
      const cat = await this.prisma.channelCategory.findFirst({ where: { id: dto.categoryId, serverId } });
      if (!cat) throw new BadRequestException('Categoria inválida para este servidor.');
    }
    const count = await this.prisma.channel.count({ where: { serverId } });
    const row = await this.prisma.channel.create({
      data: {
        serverId,
        name: dto.name.toLowerCase().replace(/\s+/g, '-'),
        type: 'text',
        position: count,
        categoryId: dto.categoryId ?? null,
      },
    });
    await this.logAudit(serverId, userId, 'channel.create', row.id, { name: row.name, categoryId: row.categoryId });
    this.eventBus.publish({ type: 'CHANNEL_CREATE', serverId, channelId: row.id, name: row.name });
    return row;
  }

  async listAuditLogs(serverId: string, userId: string, take = 80) {
    const m = await this.requireMemberFull(serverId, userId);
    if (!this.canModerate(m)) throw new ForbiddenException('Sem permissão para ver o registo de auditoria.');
    return this.prisma.communityAuditLog.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
    });
  }

  async saveCommunityUpload(serverId: string, userId: string, file: Express.Multer.File) {
    await this.requireMember(serverId, userId);
    if (!file?.buffer?.length) throw new BadRequestException('Ficheiro em falta.');
    const max = 5 * 1024 * 1024;
    if (file.size > max) throw new BadRequestException('Ficheiro demasiado grande (máx. 5MB).');
    const ext = (file.originalname.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] ?? '').slice(0, 8);
    const name = `${randomUUID()}${ext || ''}`;
    const dir = join(process.cwd(), 'uploads', 'community');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), file.buffer);
    const origin = process.env.API_PUBLIC_ORIGIN ?? `http://localhost:${process.env.API_PORT ?? 3001}`;
    const url = `${origin.replace(/\/$/, '')}/uploads/community/${name}`;
    return { url };
  }

  async getMessages(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!channel) throw new NotFoundException('Canal não encontrado.');
    await this.requireMember(channel.serverId, userId);
    const messages = await this.prisma.message.findMany({
      where: { channelId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        reactions: true,
        replyTo: { select: { id: true, content: true, authorId: true, authorType: true, deletedAt: true } },
        pin: { select: { id: true } },
      },
    });
    return this.hydrateMessagesList(messages);
  }

  async saveMessage(
    channelId: string,
    authorId: string,
    authorType: 'user' | 'bot',
    content: string,
    extra?: SavedMessagePayload,
  ) {
    const ch = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!ch) throw new NotFoundException('Canal não encontrado.');
    if (extra?.replyToId) {
      const parent = await this.prisma.message.findFirst({
        where: { id: extra.replyToId, channelId, deletedAt: null },
      });
      if (!parent) throw new BadRequestException('Mensagem a citar inválida.');
    }
    let mentionsJson: Prisma.InputJsonValue | undefined =
      extra?.mentions !== undefined && extra.mentions !== null
        ? (extra.mentions as Prisma.InputJsonValue)
        : undefined;
    if (authorType === 'user' && content.trim()) {
      const parsed = await this.parseMentionsFromContent(content.trim(), ch.serverId);
      if (parsed) mentionsJson = parsed;
    }
    const urls = extra?.attachmentUrls?.filter(u => typeof u === 'string' && u.length > 0 && u.length < 4096).slice(0, 8);
    const msg = await this.prisma.message.create({
      data: {
        channelId,
        authorId,
        authorType,
        content,
        messageType: extra?.messageType ?? 'text',
        imageUrl: extra?.imageUrl ?? null,
        ...(extra?.embedJson !== undefined ? { embedJson: extra.embedJson as Prisma.InputJsonValue } : {}),
        replyToId: extra?.replyToId ?? null,
        ...(urls?.length ? { attachmentUrls: urls as Prisma.InputJsonValue } : {}),
        ...(mentionsJson !== undefined ? { mentions: mentionsJson } : {}),
      },
      include: {
        reactions: true,
        replyTo: { select: { id: true, content: true, authorId: true, authorType: true, deletedAt: true } },
        pin: { select: { id: true } },
      },
    });
    const [out] = await this.hydrateMessagesList([msg]);
    this.eventBus.publish({
      type: 'MESSAGE_CREATE',
      serverId: ch.serverId,
      channelId,
      messageId: out.id,
      userId: authorId,
      authorType,
      content,
    });
    return out;
  }

  async editMessage(messageId: string, actorUserId: string, content: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { select: { serverId: true } } },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Mensagem não encontrada.');
    if (msg.authorType !== 'user' || msg.authorId !== actorUserId) {
      throw new ForbiddenException('Só podes editar as tuas mensagens.');
    }
    const mentions = await this.parseMentionsFromContent(content.trim(), msg.channel.serverId);
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date(),
        mentions: mentions === undefined ? Prisma.JsonNull : mentions,
      },
      include: {
        reactions: true,
        replyTo: { select: { id: true, content: true, authorId: true, authorType: true, deletedAt: true } },
        pin: { select: { id: true } },
      },
    });
    const [out] = await this.hydrateMessagesList([updated]);
    await this.logAudit(msg.channel.serverId, actorUserId, 'message.edit', messageId);
    this.eventBus.publish({
      type: 'MESSAGE_UPDATE',
      serverId: msg.channel.serverId,
      channelId: msg.channelId,
      messageId: out.id,
      userId: actorUserId,
      content: content.trim(),
    });
    return out;
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { select: { serverId: true, id: true } } },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Mensagem não encontrada.');
    await this.requireMember(msg.channel.serverId, userId);
    const norm = emoji.trim();
    if (!norm || norm.length > 32) throw new BadRequestException('Emoji inválido.');
    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji: norm } },
    });
    if (existing) await this.prisma.messageReaction.delete({ where: { id: existing.id } });
    else await this.prisma.messageReaction.create({ data: { messageId, userId, emoji: norm } });
    const reactions = await this.prisma.messageReaction.findMany({ where: { messageId } });
    return {
      messageId,
      channelId: msg.channelId,
      reactions: reactions.map(r => ({ emoji: r.emoji, userId: r.userId })),
    };
  }

  async pinMessage(channelId: string, messageId: string, actorUserId: string) {
    const ch = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!ch) throw new NotFoundException('Canal não encontrado.');
    const m = await this.requireMemberFull(ch.serverId, actorUserId);
    if (!this.canModerate(m)) throw new ForbiddenException('Só moderadores podem fixar mensagens.');
    const target = await this.prisma.message.findFirst({ where: { id: messageId, channelId, deletedAt: null } });
    if (!target) throw new NotFoundException('Mensagem não encontrada neste canal.');
    try {
      await this.prisma.pinnedMessage.create({
        data: { channelId, messageId, pinnedBy: actorUserId },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Mensagem já fixada.');
      }
      throw e;
    }
    await this.logAudit(ch.serverId, actorUserId, 'message.pin', messageId);
    return { ok: true };
  }

  async unpinMessage(channelId: string, messageId: string, actorUserId: string) {
    const ch = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!ch) throw new NotFoundException('Canal não encontrado.');
    const m = await this.requireMemberFull(ch.serverId, actorUserId);
    if (!this.canModerate(m)) throw new ForbiddenException('Só moderadores podem desafixar.');
    await this.prisma.pinnedMessage.deleteMany({ where: { channelId, messageId } });
    await this.logAudit(ch.serverId, actorUserId, 'message.unpin', messageId);
    return { ok: true };
  }

  async listPins(channelId: string, userId: string) {
    await this.requireChannelMember(channelId, userId);
    const pins = await this.prisma.pinnedMessage.findMany({
      where: { channelId },
      orderBy: { pinnedAt: 'desc' },
      include: {
        message: {
          include: {
            reactions: true,
            replyTo: { select: { id: true, content: true, authorId: true, authorType: true, deletedAt: true } },
            pin: { select: { id: true } },
          },
        },
      },
    });
    const rows = pins.map(p => p.message).filter(Boolean) as MessageWithRels[];
    return this.hydrateMessagesList(rows);
  }

  async deleteMessage(messageId: string, actorUserId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId }, include: { channel: true } });
    if (!msg || msg.deletedAt) throw new NotFoundException('Mensagem não encontrada.');
    const m = await this.requireMemberFull(msg.channel.serverId, actorUserId);
    const isAuthor = msg.authorType === 'user' && msg.authorId === actorUserId;
    if (!isAuthor && !this.canModerate(m)) throw new ForbiddenException('Sem permissão para apagar esta mensagem.');
    await this.prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    await this.logAudit(msg.channel.serverId, actorUserId, 'message.delete', messageId, { wasAuthor: isAuthor });
    return { id: messageId, channelId: msg.channelId };
  }

  /** API de bots: apagar apenas mensagens publicadas pelo próprio bot. */
  async deleteMessageAsBot(messageId: string, botId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { select: { serverId: true } } },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Mensagem não encontrada.');
    if (msg.authorType !== 'bot' || msg.authorId !== botId) {
      throw new ForbiddenException('O bot só pode apagar as próprias mensagens.');
    }
    const sb = await this.prisma.serverBot.findUnique({
      where: { serverId_botId: { serverId: msg.channel.serverId, botId } },
    });
    if (!sb) throw new ForbiddenException('Bot não está neste servidor.');
    await this.prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    await this.logAudit(msg.channel.serverId, botId, 'message.delete', messageId, { wasAuthor: true, viaBotApi: true });
    return { id: messageId, channelId: msg.channelId };
  }

  async kickMember(serverId: string, targetUserId: string, actorUserId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Servidor não encontrado.');
    if (targetUserId === server.ownerId) throw new ForbiddenException('Não podes expulsar o dono do servidor.');
    await this.requireModerator(serverId, actorUserId);
    if (targetUserId === actorUserId) throw new BadRequestException('Usa sair do servidor em vez de te expulsares a ti mesmo.');
    await this.prisma.serverMember.deleteMany({ where: { serverId, userId: targetUserId } });
    await this.logAudit(serverId, actorUserId, 'member.kick', targetUserId);
    this.eventBus.publish({ type: 'MEMBER_LEAVE', serverId, userId: targetUserId, reason: 'kick' });
    return { ok: true };
  }

  async banMember(serverId: string, targetUserId: string, actorUserId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Servidor não encontrado.');
    if (targetUserId === server.ownerId) throw new ForbiddenException('Não podes banir o dono.');
    await this.requireModerator(serverId, actorUserId);
    await this.prisma.$transaction(async (tx) => {
      await tx.communityBan.deleteMany({ where: { serverId, userId: targetUserId } });
      await tx.communityBan.create({ data: { serverId, userId: targetUserId } });
      await tx.serverMember.deleteMany({ where: { serverId, userId: targetUserId } });
    });
    await this.logAudit(serverId, actorUserId, 'member.ban', targetUserId);
    this.eventBus.publish({ type: 'MEMBER_LEAVE', serverId, userId: targetUserId, reason: 'ban' });
    return { ok: true };
  }

  async unbanMember(serverId: string, targetUserId: string, actorUserId: string) {
    await this.requireModerator(serverId, actorUserId);
    await this.prisma.communityBan.deleteMany({ where: { serverId, userId: targetUserId } });
    await this.logAudit(serverId, actorUserId, 'member.unban', targetUserId);
    return { ok: true };
  }

  async muteMember(serverId: string, targetUserId: string, minutes: number, actorUserId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Servidor não encontrado.');
    if (targetUserId === server.ownerId) throw new ForbiddenException('Não podes silenciar o dono.');
    await this.requireModerator(serverId, actorUserId);
    const until = new Date();
    until.setMinutes(until.getMinutes() + Math.min(Math.max(minutes, 1), 10080));
    await this.prisma.serverMember.updateMany({
      where: { serverId, userId: targetUserId },
      data: { mutedUntil: until },
    });
    return { ok: true, mutedUntil: until };
  }

  async unmuteMember(serverId: string, targetUserId: string, actorUserId: string) {
    await this.requireModerator(serverId, actorUserId);
    await this.prisma.serverMember.updateMany({
      where: { serverId, userId: targetUserId },
      data: { mutedUntil: null },
    });
    return { ok: true };
  }

  private async requireModerator(serverId: string, userId: string): Promise<MemberFull> {
    const m = await this.requireMemberFull(serverId, userId);
    if (!this.canModerate(m)) throw new ForbiddenException('Sem permissão de moderação.');
    return m;
  }

  /** Usado por bots administradores: o utilizador que enviou o comando deve poder moderar. */
  async assertActorCanModerate(serverId: string, actorUserId: string) {
    await this.requireModerator(serverId, actorUserId);
  }

  async listRoles(serverId: string, userId: string) {
    await this.requireMember(serverId, userId);
    return this.prisma.communityRole.findMany({ where: { serverId }, orderBy: { position: 'asc' } });
  }

  async createRole(serverId: string, actorId: string, dto: CreateCommunityRoleDto) {
    const m = await this.requireMemberFull(serverId, actorId);
    if (!this.isAdminLegacy(m)) throw new ForbiddenException('Só administradores podem criar cargos.');
    try {
      return await this.prisma.communityRole.create({
        data: {
          serverId,
          name: dto.name.trim(),
          color: dto.color ?? null,
          position: dto.position ?? 0,
          canModerate: dto.canModerate ?? false,
          canManageServer: dto.canManageServer ?? false,
          canManageChannels: dto.canManageChannels ?? false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um cargo com este nome.');
      }
      throw e;
    }
  }

  async updateRole(serverId: string, roleId: string, actorId: string, dto: UpdateCommunityRoleDto) {
    const m = await this.requireMemberFull(serverId, actorId);
    if (!this.isAdminLegacy(m)) throw new ForbiddenException('Só administradores podem editar cargos.');
    const role = await this.prisma.communityRole.findFirst({ where: { id: roleId, serverId } });
    if (!role) throw new NotFoundException('Cargo não encontrado.');
    return this.prisma.communityRole.update({
      where: { id: roleId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.canModerate !== undefined ? { canModerate: dto.canModerate } : {}),
        ...(dto.canManageServer !== undefined ? { canManageServer: dto.canManageServer } : {}),
        ...(dto.canManageChannels !== undefined ? { canManageChannels: dto.canManageChannels } : {}),
      },
    });
  }

  async deleteRole(serverId: string, roleId: string, actorId: string) {
    const m = await this.requireMemberFull(serverId, actorId);
    if (!this.isAdminLegacy(m)) throw new ForbiddenException('Só administradores podem apagar cargos.');
    const role = await this.prisma.communityRole.findFirst({ where: { id: roleId, serverId } });
    if (!role) throw new NotFoundException('Cargo não encontrado.');
    await this.prisma.serverMember.updateMany({ where: { communityRoleId: roleId }, data: { communityRoleId: null } });
    await this.prisma.communityRole.delete({ where: { id: roleId } });
    return { ok: true };
  }

  async assignMemberRole(serverId: string, targetUserId: string, actorId: string, dto: AssignMemberRoleDto) {
    const m = await this.requireMemberFull(serverId, actorId);
    if (!this.isAdminLegacy(m)) throw new ForbiddenException('Só administradores podem atribuir cargos.');
    if (dto.communityRoleId) {
      const role = await this.prisma.communityRole.findFirst({ where: { id: dto.communityRoleId, serverId } });
      if (!role) throw new NotFoundException('Cargo não encontrado neste servidor.');
    }
    const target = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId: targetUserId } } });
    if (!target) throw new NotFoundException('Membro não encontrado.');
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (targetUserId === server?.ownerId) throw new ForbiddenException('O dono mantém o cargo de administrador base.');
    return this.prisma.serverMember.update({
      where: { serverId_userId: { serverId, userId: targetUserId } },
      data: { communityRoleId: dto.communityRoleId ?? null },
    });
  }

  async updateServerBot(serverId: string, botId: string, actorId: string, isAdminBot: boolean) {
    const m = await this.requireMemberFull(serverId, actorId);
    if (!this.isAdminLegacy(m)) throw new ForbiddenException('Só administradores podem marcar bots de administração.');
    const row = await this.prisma.serverBot.findUnique({ where: { serverId_botId: { serverId, botId } } });
    if (!row) throw new NotFoundException('Bot não está neste servidor.');
    return this.prisma.serverBot.update({ where: { id: row.id }, data: { isAdminBot } });
  }

  async addBotToServer(serverId: string, botId: string, userId: string) {
    const member = await this.requireMemberFull(serverId, userId);
    if (!this.isAdminLegacy(member) && !this.canManageServerPerm(member)) {
      throw new ForbiddenException('Sem permissão para adicionar bots.');
    }
    const exists = await this.prisma.serverBot.findUnique({ where: { serverId_botId: { serverId, botId } } });
    if (exists) throw new ConflictException('Bot já está neste servidor.');
    return this.prisma.serverBot.create({
      data: { serverId, botId },
      include: { bot: { select: { id: true, name: true, prefix: true } } },
    });
  }

  async assertNotMuted(channelId: string, userId: string) {
    const ch = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!ch) throw new NotFoundException('Canal não encontrado.');
    const m = await this.memberFull(ch.serverId, userId);
    if (!m) throw new ForbiddenException('Não és membro deste servidor.');
    if (m.mutedUntil && m.mutedUntil > new Date()) {
      throw new ForbiddenException('Estás silenciado neste servidor.');
    }
  }

  /** Texto formatado para resposta de bot (!membros). */
  async formatMembersListForBot(serverId: string): Promise<string> {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { members: { include: { communityRole: true } } },
    });
    if (!server) return 'Servidor não encontrado.';
    const ids = server.members.map(x => x.userId);
    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, username: true, displayName: true },
    });
    const pm = new Map(profiles.map(p => [p.userId, p]));
    const lines = server.members.map(mem => {
      const p = pm.get(mem.userId);
      const label = p?.displayName ?? p?.username ?? mem.userId.slice(0, 8);
      const tag = mem.role === 'admin' ? '[Admin]' : mem.communityRole ? `[${mem.communityRole.name}]` : '[Membro]';
      return `${tag} ${label} (${mem.userId})`;
    });
    return `**Membros (${lines.length})**\n` + lines.join('\n');
  }

  async requireMember(serverId: string, userId: string) {
    const m = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId } } });
    if (!m) throw new ForbiddenException('Não és membro deste servidor.');
    return m;
  }

  async requireChannelMember(channelId: string, userId: string) {
    const ch = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!ch) throw new NotFoundException('Canal não encontrado.');
    return this.requireMember(ch.serverId, userId);
  }
}