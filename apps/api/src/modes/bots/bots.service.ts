import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBotDto, AddCommandDto } from './dto/bots.dto';

@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateBotDto) {
    return this.prisma.bot.create({ data: { ownerId, name: dto.name, description: dto.description, prefix: dto.prefix ?? '!' }, include: { commands: true } });
  }

  async listMine(ownerId: string) {
    return this.prisma.bot.findMany({ where: { ownerId }, include: { commands: true, _count: { select: { servers: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async getOne(botId: string, ownerId: string) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, include: { commands: true, servers: { include: { server: { select: { id: true, name: true } } } } } });
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
    return this.prisma.botCommand.create({ data: { botId, trigger: dto.trigger.toLowerCase(), response: dto.response } });
  }

  async removeCommand(commandId: string, ownerId: string) {
    const cmd = await this.prisma.botCommand.findUnique({ where: { id: commandId }, include: { bot: true } });
    if (!cmd) throw new NotFoundException('Comando não encontrado.');
    if (cmd.bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    await this.prisma.botCommand.delete({ where: { id: commandId } });
  }

  async checkTriggers(channelId: string, content: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!channel) return null;
    const serverBots = await this.prisma.serverBot.findMany({ where: { serverId: channel.serverId }, include: { bot: { include: { commands: true } } } });
    const lower = content.toLowerCase().trim();
    for (const { bot } of serverBots) {
      for (const cmd of bot.commands) {
        if (lower.startsWith((bot.prefix + cmd.trigger).toLowerCase())) {
          return { botId: bot.id, botName: bot.name, response: cmd.response };
        }
      }
    }
    return null;
  }
}
