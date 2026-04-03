import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BotTriggerHit } from './bot-trigger.types';
import { BuilderFlowV1, parseBuilderFlow } from './bot-engine.types';
import { BotEngineBudgetService } from './bot-engine-budget.service';
import { BotExecutionLogService } from './bot-execution-log.service';

@Injectable()
export class BotEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly budget: BotEngineBudgetService,
    private readonly execLog: BotExecutionLogService,
  ) {}

  /**
   * Avalia fluxos do builder para MESSAGE_CREATE (apenas mensagens de utilizador).
   * Prefixo/comandos clássicos devem ser tentados antes (BotsService).
   */
  async evaluateMessageCreate(
    channelId: string,
    content: string,
    actorUserId: string,
  ): Promise<BotTriggerHit | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { serverId: true },
    });
    if (!channel) return null;
    const serverId = channel.serverId;

    if (!this.budget.allowChannel(channelId)) {
      return null;
    }

    const contextLines = await this.loadContextPreview(channelId);

    const serverBots = await this.prisma.serverBot.findMany({
      where: { serverId },
      include: { bot: true },
    });

    const text = content.trim();

    for (const row of serverBots) {
      const flow = parseBuilderFlow(row.bot.builderFlow);
      if (!flow?.nodes?.length) continue;

      const hit = this.runMessageCreateChain(flow, {
        channelId,
        serverId,
        content: text,
        userId: actorUserId,
        botId: row.bot.id,
        botName: row.bot.name,
      });
      if (hit) {
        await this.execLog.log({
          botId: row.bot.id,
          serverId,
          channelId,
          kind: 'engine_match',
          ok: true,
          detail: {
            userId: actorUserId,
            messagePreview: text.slice(0, 200),
            replyPreview: hit.content.slice(0, 200),
            contextPreview: contextLines,
          },
        });
        return hit;
      }
    }

    return null;
  }

  /** FASE 8 — contexto leve: últimas mensagens do canal (opcional via env). */
  private async loadContextPreview(channelId: string): Promise<string[] | undefined> {
    const n = Number(this.config.get('BOT_ENGINE_CONTEXT_MESSAGES') ?? 0);
    if (n <= 0) return undefined;
    const msgs = await this.prisma.message.findMany({
      where: { channelId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Math.min(n, 15),
      select: { authorType: true, content: true },
    });
    return msgs.reverse().map(m => `${m.authorType}:${m.content.slice(0, 120)}`);
  }

  private runMessageCreateChain(
    flow: BuilderFlowV1,
    ctx: {
      channelId: string;
      serverId: string;
      content: string;
      userId: string;
      botId: string;
      botName: string;
    },
  ): BotTriggerHit | null {
    const nodes = flow.nodes;
    const start = nodes.findIndex(
      n => n.type === 'trigger' && n.event === 'MESSAGE_CREATE',
    );
    if (start === -1) return null;

    for (let i = start + 1; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.type === 'condition') {
        if (n.kind === 'contains') {
          if (!ctx.content.toLowerCase().includes(n.value.toLowerCase())) return null;
        } else if (n.kind === 'channel') {
          if (ctx.channelId !== n.channelId) return null;
        } else {
          return null;
        }
      } else if (n.type === 'action') {
        if (n.kind === 'reply') {
          return {
            botId: ctx.botId,
            botName: ctx.botName,
            content: n.text,
            messageType: 'text',
          };
        }
        return null;
      } else if (n.type === 'trigger') {
        break;
      }
    }
    return null;
  }
}
