import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BotExecutionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    botId: string;
    serverId: string;
    channelId: string;
    kind: string;
    ok: boolean;
    detail?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.botExecutionLog.create({
        data: {
          botId: params.botId,
          serverId: params.serverId,
          channelId: params.channelId,
          kind: params.kind,
          ok: params.ok,
          ...(params.detail !== undefined ? { detail: params.detail as object } : {}),
        },
      });
    } catch (e) {
      console.error('[BotExecutionLog]', e);
    }
  }

  async listForOwner(botId: string, ownerId: string, take = 40) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: { ownerId: true } });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    const rows = await this.prisma.botExecutionLog.findMany({
      where: { botId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
      select: {
        id: true,
        serverId: true,
        channelId: true,
        kind: true,
        ok: true,
        detail: true,
        createdAt: true,
      },
    });
    return rows;
  }
}
