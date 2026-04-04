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

  async getDailyStats(botId: string, ownerId: string) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: { ownerId: true } });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    const twentyFourHoursAgo = new Date(Date.now() - 86400000);

    const logs = await this.prisma.botExecutionLog.findMany({
      where: {
        botId,
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: { ok: true, detail: true },
    });

    const success = logs.filter(l => l.ok).length;
    const failed = logs.filter(l => !l.ok).length;
    const total = logs.length;
    const successRate = total > 0 ? Math.round((success / total) * 10000) / 100 : 0;

    const latencies = logs
      .map(l => (l.detail as any)?.latency || 0)
      .filter(l => l > 0);
    const avgLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
      : 0;

    return { total, success, failed, successRate, avgLatency };
  }

  async getEventTimeline(botId: string, ownerId: string) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: { ownerId: true } });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    const twentyFourHoursAgo = new Date(Date.now() - 86400000);

    const logs = await this.prisma.botExecutionLog.findMany({
      where: {
        botId,
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: { createdAt: true, ok: true },
    });

    const timeline = new Map<string, { success: number; failed: number }>();

    for (const log of logs) {
      const hour = new Date(log.createdAt);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();

      if (!timeline.has(key)) {
        timeline.set(key, { success: 0, failed: 0 });
      }

      const stats = timeline.get(key)!;
      if (log.ok) stats.success++;
      else stats.failed++;
    }

    return Array.from(timeline.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, { success, failed }]) => ({
        hour,
        count: success + failed,
        success,
        failed,
      }));
  }

  async getTriggerBreakdown(botId: string, ownerId: string) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: { ownerId: true } });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    if (bot.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    const twentyFourHoursAgo = new Date(Date.now() - 86400000);

    const logs = await this.prisma.botExecutionLog.findMany({
      where: {
        botId,
        kind: 'TRIGGER_MATCH',
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: { ok: true, detail: true },
    });

    const breakdown = new Map<string, { success: number; failed: number }>();

    for (const log of logs) {
      const trigger = ((log.detail as any)?.trigger as string) || 'unknown';

      if (!breakdown.has(trigger)) {
        breakdown.set(trigger, { success: 0, failed: 0 });
      }

      const stats = breakdown.get(trigger)!;
      if (log.ok) stats.success++;
      else stats.failed++;
    }

    return Array.from(breakdown.entries())
      .map(([trigger, { success, failed }]) => ({
        trigger,
        count: success + failed,
        success,
        failed,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
