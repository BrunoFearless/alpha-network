import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServerDto, CreateChannelDto } from './dto/community.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async createServer(ownerId: string, dto: CreateServerDto) {
    return this.prisma.server.create({
      data: {
        ownerId, name: dto.name, description: dto.description,
        channels: { create: { name: 'geral', type: 'text', position: 0 } },
        members:  { create: { userId: ownerId, role: 'admin' } },
      },
      include: { channels: true, _count: { select: { members: true } } },
    });
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
        channels: { orderBy: { position: 'asc' } },
        members:  { select: { userId: true, role: true } },
        bots: { include: { bot: { select: { id: true, name: true, prefix: true } } } },
        _count: { select: { members: true } },
      },
    });
    if (!server || server.deletedAt) throw new NotFoundException('Servidor não encontrado.');
    const userIds  = server.members.map(m => m.userId);
    const profiles = await this.prisma.profile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, username: true, displayName: true, avatarUrl: true } });
    const pm = new Map(profiles.map(p => [p.userId, p]));
    return { ...server, membersCount: server._count.members, members: server.members.map(m => ({ ...m, profile: pm.get(m.userId) ?? null })) };
  }

  async joinByInvite(inviteCode: string, userId: string) {
    const server = await this.prisma.server.findUnique({ where: { inviteCode } });
    if (!server || server.deletedAt) throw new NotFoundException('Código de convite inválido.');
    const existing = await this.prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: server.id, userId } } });
    if (!existing) await this.prisma.serverMember.create({ data: { serverId: server.id, userId, role: 'member' } });
    return this.getServer(server.id, userId);
  }

  async createChannel(serverId: string, userId: string, dto: CreateChannelDto) {
    const member = await this.requireMember(serverId, userId);
    if (member.role !== 'admin') throw new ForbiddenException('Só admins podem criar canais.');
    const count = await this.prisma.channel.count({ where: { serverId } });
    return this.prisma.channel.create({ data: { serverId, name: dto.name.toLowerCase().replace(/\s+/g, '-'), type: 'text', position: count } });
  }

  async getMessages(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!channel) throw new NotFoundException('Canal não encontrado.');
    await this.requireMember(channel.serverId, userId);
    const messages = await this.prisma.message.findMany({ where: { channelId, deletedAt: null }, orderBy: { createdAt: 'asc' }, take: 50 });
    const humanIds = [...new Set(messages.filter(m => m.authorType === 'user').map(m => m.authorId))];
    const botIds   = [...new Set(messages.filter(m => m.authorType === 'bot').map(m => m.authorId))];
    const [profiles, bots] = await Promise.all([
      this.prisma.profile.findMany({ where: { userId: { in: humanIds } }, select: { userId: true, displayName: true, username: true, avatarUrl: true } }),
      this.prisma.bot.findMany({ where: { id: { in: botIds } }, select: { id: true, name: true } }),
    ]);
    const pm = new Map(profiles.map(p => [p.userId, p]));
    const bm = new Map(bots.map(b => [b.id, b]));
    return messages.map(msg => ({
      ...msg,
      authorName: msg.authorType === 'user' ? (pm.get(msg.authorId)?.displayName ?? pm.get(msg.authorId)?.username ?? 'Utilizador') : (bm.get(msg.authorId)?.name ?? 'Bot'),
      authorAvatarUrl: msg.authorType === 'user' ? (pm.get(msg.authorId)?.avatarUrl ?? null) : null,
    }));
  }

  async saveMessage(channelId: string, authorId: string, authorType: 'user' | 'bot', content: string) {
    const msg = await this.prisma.message.create({ data: { channelId, authorId, authorType, content } });
    let authorName = 'Utilizador'; let authorAvatarUrl: string | null = null;
    if (authorType === 'user') {
      const p = await this.prisma.profile.findUnique({ where: { userId: authorId }, select: { displayName: true, username: true, avatarUrl: true } });
      if (p) { authorName = p.displayName ?? p.username ?? authorName; authorAvatarUrl = p.avatarUrl ?? null; }
    } else {
      const b = await this.prisma.bot.findUnique({ where: { id: authorId }, select: { name: true } });
      if (b) authorName = b.name;
    }
    return { ...msg, authorName, authorAvatarUrl };
  }

  async addBotToServer(serverId: string, botId: string, userId: string) {
    const member = await this.requireMember(serverId, userId);
    if (member.role !== 'admin') throw new ForbiddenException('Só admins podem adicionar bots.');
    const exists = await this.prisma.serverBot.findUnique({ where: { serverId_botId: { serverId, botId } } });
    if (exists) throw new ConflictException('Bot já está neste servidor.');
    return this.prisma.serverBot.create({ data: { serverId, botId }, include: { bot: { select: { id: true, name: true, prefix: true } } } });
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
