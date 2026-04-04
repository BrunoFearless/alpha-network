import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityService } from '../community/community.service';
import { CreateBotDto, AddCommandDto, UpdateBotDto } from './dto/bots.dto';
import { BotTriggerHit } from './bot-trigger.types';
import { BotEngineService } from './bot-engine.service';
import { BotExecutionLogService } from './bot-execution-log.service';
import { validateBuilderFlowJson } from './bot-engine.types';

export type { BotTriggerHit };

@Injectable()
export class BotsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CommunityService))
    private readonly community: CommunityService,
    @Inject(forwardRef(() => BotEngineService))
    private readonly engine: BotEngineService,
    private readonly executionLogs: BotExecutionLogService,
  ) {}

  async create(ownerId: string, dto: CreateBotDto) {
    return this.prisma.bot.create({
      data: { ownerId, name: dto.name, description: dto.description, prefix: dto.prefix ?? '!' },
      include: { commands: true },
    });
  }

  async listMine(ownerId: string) {
    return this.prisma.bot.findMany({
      where: { ownerId },
      include: { commands: true, _count: { select: { servers: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMarketplace() {
    return this.prisma.bot.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        prefix: true,
        createdAt: true,
        _count: { select: { servers: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async listExecutionLogs(botId: string, ownerId: string, take = 40) {
    return this.executionLogs.listForOwner(botId, ownerId, take);
  }

  async getOne(botId: string, ownerId: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      include: { commands: true, servers: { include: { server: { select: { id: true, name: true } } } } },
    });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    return bot;
  }

  async addCommand(botId: string, ownerId: string, dto: AddCommandDto) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    const dup = await this.prisma.botCommand.findUnique({ where: { botId_trigger: { botId, trigger: dto.trigger } } });
    if (dup) throw new ConflictException(`Trigger "${dto.trigger}" já existe.`);
    const responseType = dto.responseType ?? 'text';
    return this.prisma.botCommand.create({
      data: {
        botId,
        trigger: dto.trigger.toLowerCase(),
        response: dto.response,
        responseType,
        imageUrl: dto.imageUrl ?? null,
        ...(dto.embedJson !== undefined ? { embedJson: dto.embedJson as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async update(botId: string, ownerId: string, dto: UpdateBotDto) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    const data: Prisma.BotUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.customColor !== undefined) data.customColor = dto.customColor;
    if (dto.prefix !== undefined) data.prefix = dto.prefix;
    if (dto.builderFlow !== undefined) {
      if (dto.builderFlow !== null) {
        const err = validateBuilderFlowJson(dto.builderFlow);
        if (err) throw new BadRequestException(err);
      }
      data.builderFlow = dto.builderFlow === null ? Prisma.JsonNull : (dto.builderFlow as Prisma.InputJsonValue);
    }
    if (dto.isPublic !== undefined) {
      data.isPublic = dto.isPublic;
      if (dto.isPublic === true && bot.isPublic === false) {
        data.version = { increment: 1 };
      }
    }
    if (Object.keys(data).length === 0) {
      return this.prisma.bot.findUniqueOrThrow({ where: { id: botId }, include: { commands: true, servers: { include: { server: { select: { id: true, name: true } } } } } });
    }
    return this.prisma.bot.update({
      where: { id: botId },
      data,
      include: { commands: true, servers: { include: { server: { select: { id: true, name: true } } } } },
    });
  }

  async removeCommand(commandId: string, ownerId: string) {
    const cmd = await this.prisma.botCommand.findUnique({ where: { id: commandId }, include: { bot: true } });
    if (!cmd) throw new NotFoundException('Comando não encontrado.');
    if (cmd.bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    await this.prisma.botCommand.delete({ where: { id: commandId } });
  }

  /** Prefixo + comandos; se não houver match, corre o fluxo do builder (engine unificada). */
  async checkTriggersAndEngine(
    channelId: string,
    content: string,
    actorUserId: string,
  ): Promise<BotTriggerHit | null> {
    const prefix = await this.checkTriggers(channelId, content, actorUserId);
    if (prefix) return prefix;
    return this.engine.evaluateMessageCreate(channelId, content, actorUserId);
  }

  async checkTriggers(channelId: string, content: string, actorUserId: string): Promise<BotTriggerHit | null> {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!channel) return null;
    const serverId = channel.serverId;

    const serverBots = await this.prisma.serverBot.findMany({
      where: { serverId },
      include: { bot: { include: { commands: { orderBy: { trigger: 'asc' } } } } },
    });

    const raw = content.trim();
    const lower = raw.toLowerCase();

    for (const row of serverBots) {
      const { bot, isAdminBot } = row;
      const prefix = bot.prefix || '!';
      const pLower = prefix.toLowerCase();
      if (!lower.startsWith(pLower)) continue;

      const rest = raw.slice(prefix.length).trim();
      const restLower = rest.toLowerCase();

      for (const cmd of bot.commands) {
        const key = (prefix + cmd.trigger).toLowerCase();
        if (lower.startsWith(key)) {
          return this.commandToHit(bot.id, bot.name, cmd);
        }
      }

      if (restLower === 'ajuda' || restLower.startsWith('ajuda ')) {
        return this.buildAjudaHit(bot);
      }
      if (restLower === 'membros' || restLower.startsWith('membros ')) {
        const text = await this.community.formatMembersListForBot(serverId);
        return {
          botId: bot.id,
          botName: bot.name,
          content: text,
          messageType: 'embed',
          embedJson: {
            title: `Membros — ${bot.name}`,
            description: text.replace(/\*\*/g, ''),
            color: '#7C6FAD',
            footer: 'Alpha Network · Comunidade',
          },
        };
      }

      if (isAdminBot) {
        const modHit = await this.tryAdminBotActions(serverId, bot, rest, actorUserId);
        if (modHit) return modHit;
      }
    }

    return null;
  }

  private commandToHit(botId: string, botName: string, cmd: { response: string; responseType: string; imageUrl: string | null; embedJson: unknown }) {
    const t = (cmd.responseType || 'text') as 'text' | 'image' | 'embed';
    if (t === 'image' && cmd.imageUrl) {
      return {
        botId,
        botName,
        content: cmd.response || ' ',
        messageType: 'image' as const,
        imageUrl: cmd.imageUrl,
        embedJson: null,
      };
    }
    if (t === 'embed') {
      const base = (cmd.embedJson && typeof cmd.embedJson === 'object' ? cmd.embedJson : {}) as Record<string, unknown>;
      return {
        botId,
        botName,
        content: cmd.response || '',
        messageType: 'embed' as const,
        imageUrl: cmd.imageUrl ?? null,
        embedJson: {
          title: (base.title as string) || botName,
          description: (base.description as string) || cmd.response,
          color: (base.color as string) || '#C9A84C',
          footer: (base.footer as string) || undefined,
          imageUrl: cmd.imageUrl || (base.imageUrl as string) || undefined,
        },
      };
    }
    return { botId, botName, content: cmd.response, messageType: 'text' as const };
  }

  private buildAjudaHit(bot: { id: string; name: string; prefix: string; commands: { trigger: string; response: string; responseType: string }[] }) {
    const lines = bot.commands.map(c => `${bot.prefix}${c.trigger} — ${c.responseType === 'text' ? (c.response.slice(0, 80) + (c.response.length > 80 ? '…' : '')) : `[${c.responseType}]`}`);
    const builtIns = [`${bot.prefix}ajuda — lista de comandos`, `${bot.prefix}membros — membros do servidor`];
    const desc = [...builtIns, ...lines].join('\n') || 'Nenhum comando personalizado.';
    return {
      botId: bot.id,
      botName: bot.name,
      content: desc,
      messageType: 'embed' as const,
      embedJson: {
        title: `Comandos — ${bot.name}`,
        description: desc,
        color: '#C9A84C',
        footer: `Prefixo: ${bot.prefix}`,
      },
    };
  }

  private modFail(bot: { id: string; name: string }, e: unknown): BotTriggerHit {
    let text = 'Erro ao executar o comando.';
    if (e instanceof HttpException) {
      const r = e.getResponse();
      if (typeof r === 'string') text = r;
      else if (r && typeof r === 'object' && 'message' in r) {
        const m = (r as { message: string | string[] }).message;
        text = Array.isArray(m) ? m[0] : m;
      }
    }
    return { botId: bot.id, botName: bot.name, content: text, messageType: 'text' };
  }

  private async tryAdminBotActions(
    serverId: string,
    bot: { id: string; name: string },
    rest: string,
    actorUserId: string,
  ): Promise<BotTriggerHit | null> {
    const parts = rest.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    const cmd = parts[0].toLowerCase();

    try {
      await this.community.assertActorCanModerate(serverId, actorUserId);
    } catch {
      return {
        botId: bot.id,
        botName: bot.name,
        content: 'Só moderadores podem usar comandos de administração do bot.',
        messageType: 'text',
      };
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if ((cmd === 'silenciar' || cmd === 'mute') && parts.length >= 2) {
      const target = parts[1];
      const mins = parts[2] ? parseInt(parts[2], 10) : 10;
      if (!uuidRe.test(target) || Number.isNaN(mins) || mins < 1) {
        return { botId: bot.id, botName: bot.name, content: 'Uso: silenciar <userId> [minutos]', messageType: 'text' };
      }
      try {
        await this.community.muteMember(serverId, target, mins, actorUserId);
        return { botId: bot.id, botName: bot.name, content: `Utilizador silenciado por ${mins} min.`, messageType: 'text' };
      } catch (e) { return this.modFail(bot, e); }
    }

    if ((cmd === 'livre' || cmd === 'unmute') && parts.length >= 2) {
      const target = parts[1];
      if (!uuidRe.test(target)) return { botId: bot.id, botName: bot.name, content: 'Uso: livre <userId>', messageType: 'text' };
      try {
        await this.community.unmuteMember(serverId, target, actorUserId);
        return { botId: bot.id, botName: bot.name, content: 'Silêncio removido.', messageType: 'text' };
      } catch (e) { return this.modFail(bot, e); }
    }

    if ((cmd === 'expulsar' || cmd === 'kick') && parts.length >= 2) {
      const target = parts[1];
      if (!uuidRe.test(target)) return { botId: bot.id, botName: bot.name, content: 'Uso: expulsar <userId>', messageType: 'text' };
      try {
        await this.community.kickMember(serverId, target, actorUserId);
        return { botId: bot.id, botName: bot.name, content: 'Membro expulso.', messageType: 'text' };
      } catch (e) { return this.modFail(bot, e); }
    }

    if ((cmd === 'banir' || cmd === 'ban') && parts.length >= 2) {
      const target = parts[1];
      if (!uuidRe.test(target)) return { botId: bot.id, botName: bot.name, content: 'Uso: banir <userId>', messageType: 'text' };
      try {
        await this.community.banMember(serverId, target, actorUserId);
        return { botId: bot.id, botName: bot.name, content: 'Utilizador banido.', messageType: 'text' };
      } catch (e) { return this.modFail(bot, e); }
    }

    if ((cmd === 'desbanir' || cmd === 'unban') && parts.length >= 2) {
      const target = parts[1];
      if (!uuidRe.test(target)) return { botId: bot.id, botName: bot.name, content: 'Uso: desbanir <userId>', messageType: 'text' };
      try {
        await this.community.unbanMember(serverId, target, actorUserId);
        return { botId: bot.id, botName: bot.name, content: 'Ban removido.', messageType: 'text' };
      } catch (e) { return this.modFail(bot, e); }
    }

    if (cmd === 'nome' && parts.length >= 2) {
      const newName = parts.slice(1).join(' ').trim();
      if (newName.length < 2 || newName.length > 50) {
        return { botId: bot.id, botName: bot.name, content: 'Nome inválido (2–50 caracteres).', messageType: 'text' };
      }
      try {
        await this.community.updateServer(serverId, actorUserId, { name: newName });
        return { botId: bot.id, botName: bot.name, content: `Nome do servidor actualizado para «${newName}».`, messageType: 'text' };
      } catch (e) { return this.modFail(bot, e); }
    }

    return null;
  }

  async saveAvatarAndUpdate(botId: string, ownerId: string, file: Express.Multer.File, dto: UpdateBotDto) {
    try {
      console.log(`\n📤 saveAvatarAndUpdate starting...`);
      
      const bot = await this.prisma.bot.findUnique({ where: { id: botId } });
      if (!bot) throw new NotFoundException('Bot não encontrado.');
      if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

      // Import fs and path at runtime
      const fs = await import('fs/promises');
      const path = await import('path');

      // Create bot avatar directory (relative to process.cwd())
      const uploadsBase = path.resolve(process.cwd(), 'uploads');
      const botsDir = path.join(uploadsBase, 'bots');
      const botUploadDir = path.join(botsDir, botId);
      
      console.log(`🔧 Directory setup:`);
      console.log(`   Base: ${uploadsBase}`);
      console.log(`   Bots: ${botsDir}`);
      console.log(`   Bot: ${botUploadDir}`);
      
      try {
        await fs.mkdir(botUploadDir, { recursive: true });
        console.log(`   ✓ Directories created`);
      } catch (e) {
        console.error(`   ✗ Failed to create dirs:`, e.message);
        throw e;
      }

      // Generate filename with timestamp to avoid conflicts
      const ext = path.extname(file.originalname);
      const filename = `avatar-${Date.now()}${ext}`;
      const filepath = path.join(botUploadDir, filename);

      // Save file
      console.log(`📝 Saving file:`);
      console.log(`   Path: ${filepath}`);
      console.log(`   Size: ${file.size} bytes`);
      console.log(`   MIME: ${file.mimetype}`);
      
      try {
        await fs.writeFile(filepath, file.buffer);
        console.log(`   ✓ File written to disk`);
      } catch (e) {
        console.error(`   ✗ Failed to write file:`, e.message, e.code);
        throw e;
      }

      // Verify file exists
      try {
        const stat = await fs.stat(filepath);
        console.log(`✓ File verified: ${stat.size} bytes on disk`);
      } catch (e) {
        console.error(`⚠️ File verification failed:`, e.message);
        throw e;
      }

      // Delete old avatars for this bot (keep only latest)
      try {
        const files = await fs.readdir(botUploadDir);
        let deletedCount = 0;
        for (const f of files) {
          if (f.startsWith('avatar-') && f !== filename) {
            try {
              await fs.unlink(path.join(botUploadDir, f));
              deletedCount++;
              console.log(`🗑️ Deleted: ${f}`);
            } catch (e) {
              console.error(`⚠️ Failed to delete ${f}:`, e.message);
            }
          }
        }
        if (deletedCount === 0) {
          console.log(`🗑️ No old avatars to delete`);
        }
      } catch (e) {
        console.error(`⚠️ Error checking old files:`, e.message);
      }

      // Save avatar URL to bot (relative path - served via /uploads prefix)
      const avatarUrl = `/uploads/bots/${botId}/${filename}`;
      console.log(`📸 Avatar URL: ${avatarUrl}`);
      
      // Update bot with new avatar and other fields
      const data: Prisma.BotUpdateInput = { avatarUrl };
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.customColor !== undefined) data.customColor = dto.customColor;
      if (dto.prefix !== undefined) data.prefix = dto.prefix;
      if (dto.builderFlow !== undefined) {
        if (dto.builderFlow !== null) {
          const err = validateBuilderFlowJson(dto.builderFlow);
          if (err) throw new BadRequestException(err);
        }
        data.builderFlow = dto.builderFlow === null ? Prisma.JsonNull : (dto.builderFlow as Prisma.InputJsonValue);
      }
      if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;

      console.log(`💾 Updating database...`);
      const updated = await this.prisma.bot.update({
        where: { id: botId },
        data,
        include: { commands: true, servers: { include: { server: { select: { id: true, name: true } } } } },
      });
      
      console.log(`✨ Bot updated with avatar: ${updated.avatarUrl}\n`);
      return updated;
    } catch (e) {
      console.error(`❌ Error in saveAvatarAndUpdate:`, e.message);
      console.error(e.stack);
      throw e;
    }
  }
}

