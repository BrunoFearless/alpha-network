import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BotTriggerHit } from './bot-trigger.types';
import { BuilderFlowV1, parseBuilderFlow } from './bot-engine.types';
import { BotEngineBudgetService } from './bot-engine-budget.service';
import { BotExecutionLogService } from './bot-execution-log.service';
import { PlatformEvent } from '../../platform-events/platform-events.types';

export type BotActionResult = {
  kind: string;
  executed: boolean;
  message?: string;
};

@Injectable()
export class BotEngineService {
  private readonly log = new Logger(BotEngineService.name);

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

      const hit = await this.runMessageCreateChain(flow, {
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

  /**
   * FASE 1.5 — Processa eventos via Event Bus (MESSAGE_CREATE, MEMBER_JOIN, etc.)
   */
  async processEvent(event: PlatformEvent): Promise<void> {
    // Apenas processar eventos de usuário (ignorar eventos de bots para evitar loops)
    if (event.type === 'MESSAGE_CREATE' || event.type === 'MESSAGE_UPDATE') {
      if ((event as any).authorType === 'bot') {
        return;
      }
    }

    // Validar budget apenas para eventos com channelId
    if ((event.type === 'MESSAGE_CREATE' || event.type === 'MESSAGE_UPDATE') && (event as any).channelId) {
      if (!this.budget.allowChannel((event as any).channelId)) {
        return;
      }
    }

    const serverBots = await this.prisma.serverBot.findMany({
      where: { serverId: event.serverId },
      include: { bot: true },
    });

    for (const row of serverBots) {
      const flow = parseBuilderFlow(row.bot.builderFlow);
      if (!flow?.nodes?.length) continue;

      try {
        await this.executeFlow(flow, event, row.bot.id, row.bot.name);
      } catch (e) {
        this.log.warn(`Bot execution error (${row.bot.id}):`, (e as Error)?.message);
        const channelId = ('channelId' in event) ? (event as any).channelId : 'N/A';
        await this.execLog.log({
          botId: row.bot.id,
          serverId: event.serverId,
          channelId: channelId as string,
          kind: 'execution_error',
          ok: false,
          detail: { error: (e as Error)?.message },
        });
      }
    }
  }

  private async executeFlow(
    flow: BuilderFlowV1,
    event: PlatformEvent,
    botId: string,
    botName: string,
  ): Promise<void> {
    const triggerIdx = flow.nodes.findIndex(n => n.type === 'trigger' && this.matchesTrigger(n.event, event.type));
    if (triggerIdx === -1) return;

    let conditionsPassed = true;
    let finalAction: any = null;

    for (let i = triggerIdx + 1; i < flow.nodes.length; i++) {
      const node = flow.nodes[i];

      if (node.type === 'trigger') break; // Next trigger detected

      if (node.type === 'condition') {
        if (!(await this.evaluateCondition(node, event))) {
          conditionsPassed = false;
          break;
        }
      } else if (node.type === 'action') {
        if (conditionsPassed) {
          finalAction = node;
          break;
        }
      }
    }

    if (conditionsPassed && finalAction) {
      await this.executeAction(finalAction, event, botId, botName);
    }
  }

  private matchesTrigger(triggerEvent: string, platformEventType: string): boolean {
    return triggerEvent === platformEventType;
  }

  private async evaluateCondition(node: any, event: PlatformEvent): Promise<boolean> {
    if (node.kind === 'contains') {
      if (event.type === 'MESSAGE_CREATE' || event.type === 'MESSAGE_UPDATE') {
        return (event as any).content?.toLowerCase()?.includes(node.value?.toLowerCase() ?? '') ?? false;
      }
      return true;
    }

    if (node.kind === 'channel') {
      const channelId = (event as any).channelId;
      return channelId === node.channelId;
    }

    if (node.kind === 'admin') {
      const userId = (event as any).userId;
      if (!userId) return false;
      const member = await this.prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: event.serverId, userId } },
      });
      const isAdmin = member?.role === 'admin' || member?.role === 'owner';
      return node.requireAdmin ? isAdmin : !isAdmin;
    }

    if (node.kind === 'role') {
      const userId = (event as any).userId;
      if (!userId) return false;
      const member = await this.prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: event.serverId, userId } },
        include: { communityRole: true },
      });
      return member?.communityRoleId === node.roleId;
    }

    if (node.kind === 'userId') {
      const userId = (event as any).userId;
      return userId === node.userId;
    }

    return true;
  }

  private async executeAction(node: any, event: PlatformEvent, botId: string, botName: string): Promise<void> {
    const { kind } = node;
    const channelId = ('channelId' in event) ? (event as any).channelId : 'N/A';

    if (kind === 'reply' || kind === 'sendMessage') {
      // Será enviado como mensagem de bot na resposta
      return;
    }

    if (kind === 'deleteMessage' && (event.type === 'MESSAGE_CREATE' || event.type === 'MESSAGE_UPDATE')) {
      const messageId = (event as any).messageId;
      if (!messageId) return;
      await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date() },
      });
      await this.execLog.log({
        botId,
        serverId: event.serverId,
        channelId,
        kind: 'action_deleteMessage',
        ok: true,
      });
      return;
    }

    if (kind === 'assignRole' && (event.type === 'MEMBER_JOIN' || event.type === 'MESSAGE_CREATE')) {
      const userId = (event as any).userId;
      if (!userId) return;
      const member = await this.prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: event.serverId, userId } },
      });
      if (member) {
        await this.prisma.serverMember.update({
          where: { id: member.id },
          data: { communityRoleId: node.roleId },
        });
        await this.execLog.log({
          botId,
          serverId: event.serverId,
          channelId,
          kind: 'action_assignRole',
          ok: true,
        });
      }
      return;
    }

    if (kind === 'mute' && (event.type === 'MESSAGE_CREATE' || event.type === 'MESSAGE_UPDATE')) {
      const userId = (event as any).userId;
      if (!userId) return;
      const member = await this.prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: event.serverId, userId } },
      });
      if (member) {
        await this.prisma.serverMember.update({
          where: { id: member.id },
          data: { mutedUntil: new Date(Date.now() + node.durationMs) },
        });
        await this.execLog.log({
          botId,
          serverId: event.serverId,
          channelId,
          kind: 'action_mute',
          ok: true,
          detail: { durationMs: node.durationMs },
        });
      }
      return;
    }

    if (kind === 'wait') {
      // Implementar em Fase 5.5 com fila
      return;
    }
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


  private async runMessageCreateChain(
    flow: BuilderFlowV1,
    ctx: {
      channelId: string;
      serverId: string;
      content: string;
      userId: string;
      botId: string;
      botName: string;
    },
  ): Promise<BotTriggerHit | null> {
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
        if (n.kind === 'reply' || n.kind === 'sendMessage') {
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
