// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/modes/alpha-core/alpha-core.service.ts
// ════════════════════════════════════════════════════════════════════════════

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HumanizerService } from './humanizer.service';
import Groq from 'groq-sdk';

// ── Action definitions ─────────────────────────────────────────────────────

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  requiredPermission: keyof PermissionMap;
  riskLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
  /** Se true, executa imediatamente sem pedir confirmação ao utilizador. Usado para acções de leitura. */
  executeImmediately?: boolean;
}

export interface PermissionMap {
  canEditProfile: boolean;
  canCreatePosts: boolean;
  canDeletePosts: boolean;
  canManageFriends: boolean;
  canEditTheme: boolean;
  canEditAI: boolean;
}

export const ALLOWED_ACTIONS: ActionDefinition[] = [
  {
    id: 'update_display_name',
    label: 'Alterar nome de exibição',
    description: 'Muda o teu displayName no perfil',
    requiredPermission: 'canEditProfile',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'update_bio',
    label: 'Actualizar bio',
    description: 'Actualiza a tua biografia no perfil',
    requiredPermission: 'canEditProfile',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'update_status',
    label: 'Alterar status',
    description: 'Muda o teu status atual',
    requiredPermission: 'canEditProfile',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'update_theme_color',
    label: 'Alterar cor do tema',
    description: 'Muda a cor de destaque do teu perfil no Lazer',
    requiredPermission: 'canEditTheme',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'update_banner_color',
    label: 'Alterar cor do banner',
    description: 'Muda a cor do banner do teu perfil',
    requiredPermission: 'canEditTheme',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'create_post',
    label: 'Criar publicação',
    description: 'Cria uma nova publicação no feed do Lazer',
    requiredPermission: 'canCreatePosts',
    riskLevel: 'medium',
    reversible: true,
  },
  {
    id: 'delete_post',
    label: 'Apagar publicação',
    description: 'Apaga uma das tuas publicações',
    requiredPermission: 'canDeletePosts',
    riskLevel: 'high',
    reversible: false,
  },
  {
    id: 'send_friend_request',
    label: 'Enviar pedido de amizade',
    description: 'Envia um pedido de amizade a outro utilizador',
    requiredPermission: 'canManageFriends',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'remove_friend',
    label: 'Desfazer amizade',
    description: 'Remove um utilizador da tua lista de amigos',
    requiredPermission: 'canManageFriends',
    riskLevel: 'medium',
    reversible: false,
  },
  {
    id: 'update_name_style',
    label: 'Alterar estilo do nome',
    description: 'Muda a fonte, efeito e cor do nome no perfil',
    requiredPermission: 'canEditTheme',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'update_ai_profile',
    label: 'Editar Perfil da IA',
    description: 'Actualiza os teus próprios dados (nome, bio, tagline, status)',
    requiredPermission: 'canEditAI',
    riskLevel: 'low',
    reversible: true,
  },
  {
    id: 'update_ai_personality',
    label: 'Editar Personalidade da IA',
    description: 'Actualiza os teus traços de personalidade e tom',
    requiredPermission: 'canEditAI',
    riskLevel: 'medium',
    reversible: true,
  },
  {
    id: 'accept_friend_request',
    label: 'Aceitar pedido de amizade',
    description: 'Aceita um pedido de amizade pendente recebido',
    requiredPermission: 'canManageFriends',
    riskLevel: 'low',
    reversible: false,
  },
  {
    id: 'reject_friend_request',
    label: 'Rejeitar pedido de amizade',
    description: 'Rejeita/remove um pedido de amizade pendente recebido',
    requiredPermission: 'canManageFriends',
    riskLevel: 'low',
    reversible: false,
  },
  {
    id: 'read_my_posts',
    label: 'Ver as minhas publicações',
    description: 'Lista as tuas publicações recentes com reações e comentários',
    requiredPermission: 'canCreatePosts',
    riskLevel: 'low',
    reversible: true,
    executeImmediately: true,
  },
  {
    id: 'read_conversations',
    label: 'Ver conversas privadas',
    description: 'Lista as tuas conversas DM activas com o histórico recente',
    requiredPermission: 'canManageFriends',
    riskLevel: 'low',
    reversible: true,
    executeImmediately: true,
  },
];

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class AlphaCoreService {
  private groq: Groq;

  constructor(
    private readonly prisma: PrismaService,
    private readonly humanizer: HumanizerService,
  ) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY, // fallback if user forgot
    });
  }

  // ── Chat proxy (Fase 1 + 2) ─────────────────────────────────────────────

  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    tools?: any[],
  ) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8), // Keep only the last 8 messages to save tokens
    ] as any[];

    const params: any = {
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      messages: formattedMessages,
    };

    if (tools && tools.length > 0) {
      params.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        }
      }));
    }

    return this.groq.chat.completions.create(params);
  }

  // ── Streaming chat proxy ─────────────────────────────────────────────────

  async *chatStream(
    userId: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    tools?: any[],
  ): AsyncIterable<{ type: 'text'; text: string } | { type: 'action'; action: any }> {
    if (!Array.isArray(messages)) {
      console.error('[AlphaCoreService] messages is not an array:', messages);
      throw new Error('params.messages is not an array');
    }

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8), // Keep only the last 8 messages to save tokens
    ] as any[];

    const params: any = {
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      messages: formattedMessages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      params.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));

      // Detect if user is asking for an action to force tool usage on smaller models
      const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
      
      // Ignore very short or conversational confirmations
      const isConversational = lastUserMsg.length < 15 && 
        /^(ok|obrigado|thanks|valeu|sim|não|boa|perfeito|fechado|tá|uai|entendi)/i.test(lastUserMsg);

      // Look for imperative patterns like "muda a bio", "altera o nome", "publica um post"
      // using word boundaries (\b) to avoid matching "mudaste", "alterado", etc.
      const actionPatterns = [
        /\b(muda|altera|actualiza|define|set|update|troca|personaliza)\b.*\b(bio|nome|status|cor|tema|banner|display|estilo)\b/i,
        /\b(publica|cria|faz|escreve)\b.*\b(post|publicação|mensagem|recordação)\b/i,
        /\b(adiciona|envia|pede|remove|desfaz|elimina|apaga|delete)\b.*\b(amigo|amizade|pedido|post|publicação)\b/i,
        /^(muda|altera|publica|cria|envia|pede|remove|apaga|delete)\b/i
      ];
      
      const seemsLikeAction = !isConversational && actionPatterns.some(regex => regex.test(lastUserMsg));

      params.tool_choice = seemsLikeAction ? 'required' : 'auto';
      console.log(`[AlphaCoreService] Setting tool_choice to: ${params.tool_choice} (seemsLikeAction: ${seemsLikeAction}, isConversational: ${isConversational})`);
    }

    console.log('[AlphaCoreService] Starting stream for messages:', messages.length);

    const lastUserMsg = messages[messages.length - 1]?.content || '';

    // ── 0. Humanization: Silence & Pressure Check (Pre-LLM) ──────────────────
    if (this.humanizer.shouldUseSilence(lastUserMsg)) {
      yield { type: 'text', text: this.humanizer.humanize('', lastUserMsg) };
      return;
    }
    if (this.humanizer.detectPressure(lastUserMsg)) {
      yield { type: 'text', text: this.humanizer.humanize('', lastUserMsg) };
      return;
    }

    try {
      const stream = await this.groq.chat.completions.create(params) as any;

      // Buffer for assembling tool_call arguments arriving in fragments
      const toolCallBuffers: Record<number, { name: string; args: string }> = {};
      let finishReason = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
        if (!delta) continue;

        // ── Text content ──────────────────────────────────────────────────
        if (delta.content) {
          yield { type: 'text', text: delta.content };
        }

        // ── Tool call fragments ────────────────────────────────────────────
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallBuffers[idx]) {
              toolCallBuffers[idx] = { name: tc.function?.name ?? '', args: '' };
            }
            if (tc.function?.name) toolCallBuffers[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallBuffers[idx].args += tc.function.arguments;
          }
        }
      }

      console.log(`[AlphaCoreService] Stream finished. finish_reason=${finishReason}, toolCalls=${Object.keys(toolCallBuffers).length}`);

      // ── Process complete tool calls ────────────────────────────────────
      for (const buf of Object.values(toolCallBuffers)) {
        if (!buf.name) continue;
        try {
          const payload = JSON.parse(buf.args || '{}');
          console.log(`[AlphaCoreService] Tool call: ${buf.name}`, payload);

          const actionDef = ALLOWED_ACTIONS.find(a => a.id === buf.name);

          // ── Acções de leitura: executam imediatamente, sem confirmação ──
          if (actionDef?.executeImmediately) {
            const perms = await this.getPermissions(userId);
            if (!perms[actionDef.requiredPermission]) {
              yield { type: 'text', text: `\n\nPara isso precisas de activar a permissão "${actionDef.label}" nas definições da Alpha Core.` };
              continue;
            }

            const data = await this.executeAction(userId, buf.name, payload);
            console.log(`[AlphaCoreService] Immediate action result for ${buf.name}:`, data);

            // Feed result back to LLM so it can answer naturally in text
            const followUpMessages = [
              ...formattedMessages,
              {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: `call_${buf.name}`,
                  type: 'function',
                  function: { name: buf.name, arguments: buf.args },
                }],
              },
              {
                role: 'tool',
                tool_call_id: `call_${buf.name}`,
                content: JSON.stringify(data),
              },
            ];

            const followUp = await this.groq.chat.completions.create({
              model: DEFAULT_MODEL,
              max_tokens: 512,
              messages: followUpMessages as any,
            }) as any;

            const followUpText = followUp.choices[0]?.message?.content || '';
            if (followUpText) yield { type: 'text', text: followUpText };
            continue;
          }

          // ── Resolve username → userId for user-related actions ──────────
          if (buf.name === 'send_friend_request' || buf.name === 'remove_friend') {
            const rawId = payload.toUserId ?? payload.to_user_id ?? payload.userId ?? payload.friendId ?? payload.targetId ?? payload.username;
            if (rawId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
              const profile = await this.prisma.profile.findFirst({
                where: { username: { equals: rawId, mode: 'insensitive' } },
                select: { userId: true, username: true },
              });
              if (!profile) {
                yield { type: 'text', text: `\n\nDesculpa, mas não encontrei nenhum utilizador com o nome "${rawId}" na rede. Tens a certeza que o nome está correto?` };
                continue;
              }
              payload.toUserId = profile.userId;
            }
          }

          // ── Acções normais: passam por pending → confirm → execute ──────
          const actionId = buf.name;
          const result = await this.requestAction(userId, actionId, payload);
          yield { type: 'action', action: result };
        } catch (e: any) {
          console.error('[AlphaCoreService] Tool call processing error:', e.message);
          yield { type: 'text', text: `\n\nOlha, tentei processar isso, mas deu erro: ${e.message}. Queres tentar de outra forma?` };
        }
      }
    } catch (e: any) {
      console.error('[AlphaCoreService] Groq Stream Error:', e);
      throw e;
    }
  }

  // ── Permissions ─────────────────────────────────────────────────────────

  async getPermissions(userId: string): Promise<PermissionMap> {
    // @ts-ignore
    const perms = await this.prisma.alphaCorePermission.findUnique({
      where: { userId },
    });

    if (!perms) {
      return {
        canEditProfile: false,
        canCreatePosts: false,
        canDeletePosts: false,
        canManageFriends: false,
        canEditTheme: false,
        canEditAI: false,
      };
    }

    return {
      canEditProfile: (perms as any).canEditProfile,
      canCreatePosts: (perms as any).canCreatePosts,
      canDeletePosts: (perms as any).canDeletePosts,
      canManageFriends: (perms as any).canManageFriends,
      canEditTheme: (perms as any).canEditTheme,
      canEditAI: (perms as any).canEditAI,
    };
  }

  async updatePermissions(
    userId: string,
    permissions: Partial<PermissionMap>,
  ) {
    // @ts-ignore
    return this.prisma.alphaCorePermission.upsert({
      where: { userId },
      create: { userId, ...permissions },
      update: { ...permissions, updatedAt: new Date() },
    });
  }

  async revokeAllPermissions(userId: string) {
    return this.prisma.alphaCorePermission.upsert({
      where: { userId },
      create: {
        userId,
        canEditProfile: false,
        canCreatePosts: false,
        canDeletePosts: false,
        canManageFriends: false,
        canEditTheme: false,
        // @ts-ignore
        canEditAI: false,
      },
      update: {
        canEditProfile: false,
        canCreatePosts: false,
        canDeletePosts: false,
        canManageFriends: false,
        canEditTheme: false,
        // @ts-ignore
        canEditAI: false,
        updatedAt: new Date(),
      },
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async requestAction(
    userId: string,
    actionId: string,
    payload: Record<string, any>,
  ) {
    const actionDef = ALLOWED_ACTIONS.find(a => a.id === actionId);
    if (!actionDef) {
      throw new BadRequestException(`Acção desconhecida: ${actionId}`);
    }

    const perms = await this.getPermissions(userId);
    if (!perms[actionDef.requiredPermission]) {
      throw new ForbiddenException(
        `Não tens permissão para: ${actionDef.label}. Activa-a nas definições da Alpha Core.`,
      );
    }

    const action = await this.prisma.alphaCoreAction.create({
      data: {
        userId,
        action: actionId,
        payload,
        status: 'pending',
      },
    });

    return {
      actionId: action.id,
      definition: actionDef,
      payload,
      status: 'pending',
      message: `Acção "${actionDef.label}" aguarda confirmação do utilizador.`,
    };
  }

  async confirmAndExecuteAction(userId: string, actionRecordId: string) {
    const record = await this.prisma.alphaCoreAction.findUnique({
      where: { id: actionRecordId },
    });

    if (!record || record.userId !== userId) {
      throw new NotFoundException('Acção não encontrada.');
    }
    if (record.status !== 'pending') {
      throw new BadRequestException(`Acção já foi processada (status: ${record.status}).`);
    }

    await this.prisma.alphaCoreAction.update({
      where: { id: actionRecordId },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    try {
      console.log(`[AlphaCoreService] Executing action: ${record.action} for user: ${userId}`, record.payload);
      const result = await this.executeAction(userId, record.action, record.payload as any);
      console.log(`[AlphaCoreService] Action executed successfully:`, result);

      // Sanitize result — remove undefined values before storing as JSON
      const safeResult = JSON.parse(JSON.stringify(result ?? {}));

      await this.prisma.alphaCoreAction.update({
        where: { id: actionRecordId },
        data: { status: 'executed', executedAt: new Date(), result: safeResult },
      });

      return { success: true, result: safeResult, actionId: actionRecordId };
    } catch (e: any) {
      console.error(`[AlphaCoreService] Action execution failed: ${record.action}`, e);
      await this.prisma.alphaCoreAction.update({
        where: { id: actionRecordId },
        data: { status: 'failed', result: { error: e.message } },
      });
      throw e;
    }
  }

  async rejectAction(userId: string, actionRecordId: string) {
    const record = await this.prisma.alphaCoreAction.findUnique({
      where: { id: actionRecordId },
    });
    if (!record || record.userId !== userId) throw new NotFoundException();

    return this.prisma.alphaCoreAction.update({
      where: { id: actionRecordId },
      data: { status: 'rejected' },
    });
  }

  async revertAction(userId: string, actionRecordId: string) {
    const record = await this.prisma.alphaCoreAction.findUnique({
      where: { id: actionRecordId },
    });

    if (!record || record.userId !== userId) throw new NotFoundException();
    if (record.status !== 'executed') {
      throw new BadRequestException('Só acções executadas podem ser revertidas.');
    }

    const actionDef = ALLOWED_ACTIONS.find(a => a.id === record.action);
    if (!actionDef?.reversible) {
      throw new BadRequestException(`A acção "${record.action}" não é reversível.`);
    }

    const payload = record.payload as any;
    if (payload?.previousValue !== undefined) {
      await this.executeAction(userId, record.action, {
        ...payload,
        value: payload.previousValue,
      });
    }

    return this.prisma.alphaCoreAction.update({
      where: { id: actionRecordId },
      data: { status: 'reverted', revertedAt: new Date() },
    });
  }

  async getActionHistory(userId: string, limit = 20) {
    return this.prisma.alphaCoreAction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async executeAction(
    userId: string,
    actionId: string,
    payload: Record<string, any>,
  ): Promise<any> {
    // Helper: extract a string value from multiple possible field names
    const val = (...keys: string[]): string | undefined => {
      for (const k of keys) {
        if (payload[k] !== undefined && payload[k] !== null) return String(payload[k]);
      }
      return undefined;
    };

    console.log(`[executeAction] action=${actionId} payload=`, payload);

    switch (actionId) {
      case 'update_display_name': {
        const value = val('value', 'displayName', 'name', 'display_name');
        if (!value) throw new BadRequestException('Campo "value" é obrigatório para update_display_name.');
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { displayName: true } });
        await this.prisma.profile.update({ where: { userId }, data: { displayName: value } });
        return { updated: 'displayName', value, previousValue: prev?.displayName ?? null };
      }

      case 'update_bio': {
        const value = val('value', 'bio', 'biography', 'content');
        if (!value) throw new BadRequestException('Campo "value" é obrigatório para update_bio.');
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { bio: true } });
        await this.prisma.profile.update({ where: { userId }, data: { bio: value } });
        return { updated: 'bio', value, previousValue: prev?.bio ?? null };
      }

      case 'update_status': {
        const value = val('value', 'status', 'text');
        if (!value) throw new BadRequestException('Campo "value" é obrigatório para update_status.');
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { status: true } });
        await this.prisma.profile.update({ where: { userId }, data: { status: value } });
        return { updated: 'status', value, previousValue: prev?.status ?? null };
      }

      case 'update_theme_color': {
        const value = val('value', 'color', 'themeColor', 'theme_color', 'hex');
        if (!value) throw new BadRequestException('Campo "value" é obrigatório para update_theme_color.');
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { lazerData: true } });
        const prevLazerData = (prev?.lazerData as any) ?? {};
        await this.prisma.profile.update({
          where: { userId },
          data: { lazerData: { ...prevLazerData, themeColor: value } },
        });
        return { updated: 'themeColor', value, previousValue: prevLazerData.themeColor ?? null };
      }

      case 'update_banner_color': {
        const value = val('value', 'color', 'bannerColor', 'banner_color', 'hex');
        if (!value) throw new BadRequestException('Campo "value" é obrigatório para update_banner_color.');
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { bannerColor: true } });
        await this.prisma.profile.update({ where: { userId }, data: { bannerColor: value } });
        return { updated: 'bannerColor', value, previousValue: prev?.bannerColor ?? null };
      }

      case 'update_name_style': {
        const updateData: any = {};
        const font = val('nameFont', 'font');
        const effect = val('nameEffect', 'effect');
        const color = val('nameColor', 'color');
        if (font)   updateData.nameFont   = font;
        if (effect) updateData.nameEffect = effect;
        if (color)  updateData.nameColor  = color;
        if (Object.keys(updateData).length === 0) throw new BadRequestException('Nenhum campo de estilo fornecido.');
        await this.prisma.profile.update({ where: { userId }, data: updateData });
        return { updated: 'nameStyle', ...updateData };
      }

      case 'create_post': {
        const content = val('content', 'text', 'body', 'post');
        if (!content) throw new BadRequestException('Campo "content" é obrigatório para create_post.');
        const post = await this.prisma.lazerPost.create({
          data: {
            authorId: userId,
            content,
            titleFont: payload.titleFont ?? null,
            titleColor: payload.titleColor ?? null,
          },
        });
        return { created: 'post', postId: post.id };
      }

      case 'delete_post': {
        const postId = val('postId', 'post_id', 'id');
        if (!postId) throw new BadRequestException('Campo "postId" é obrigatório para delete_post.');
        const post = await this.prisma.lazerPost.findUnique({ where: { id: postId } });
        if (!post || post.authorId !== userId) throw new ForbiddenException('Post não encontrado ou não pertence ao utilizador.');
        await this.prisma.lazerPost.update({ where: { id: postId }, data: { deletedAt: new Date() } });
        return { deleted: 'post', postId };
      }

      case 'send_friend_request': {
        const toUserId = val('toUserId', 'to_user_id', 'userId', 'friendId', 'targetId');
        if (!toUserId) throw new BadRequestException('Campo "toUserId" é obrigatório para send_friend_request.');
        const existing = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: userId, friendId: toUserId },
              { userId: toUserId, friendId: userId },
            ],
          },
        });
        if (existing) return { skipped: 'already_exists', requestId: existing.id };
        const req = await this.prisma.friendship.create({
          data: { userId: userId, friendId: toUserId, status: 'pending' },
        });
        return { created: 'friendRequest', requestId: req.id };
      }

      case 'remove_friend': {
        const toUserId = val('toUserId', 'to_user_id', 'userId', 'friendId', 'targetId');
        if (!toUserId) throw new BadRequestException('Campo "toUserId" é obrigatório para remove_friend.');
        
        const friendship = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { userId, friendId: toUserId },
              { userId: toUserId, friendId: userId },
            ],
          },
        });

        if (!friendship) return { skipped: 'not_friends' };

        await this.prisma.friendship.delete({ where: { id: friendship.id } });
        return { deleted: 'friendship', friendId: toUserId };
      }

      case 'update_ai_profile': {
        const updateData: any = {};
        // Only update if value is provided and not empty
        if (payload.name) updateData.name = payload.name;
        if (payload.bio) updateData.bio = payload.bio;
        if (payload.tagline) updateData.tagline = payload.tagline;
        if (payload.status) updateData.status = payload.status;
        if (payload.avatarUrl) updateData.avatarUrl = payload.avatarUrl;
        if (payload.bannerColor) updateData.bannerColor = payload.bannerColor;

        if (Object.keys(updateData).length === 0) throw new BadRequestException('Nenhum dado para atualizar.');

        const prev = await this.prisma.alphaAI.findUnique({ where: { userId } });
        await this.prisma.alphaAI.update({ where: { userId }, data: updateData });
        return { updated: 'aiProfile', ...updateData, previousValue: prev };
      }

      case 'update_ai_personality': {
        const updateData: any = {};
        if (payload.personalityTraits) updateData.personalityTraits = payload.personalityTraits;
        if (payload.tone) updateData.tone = payload.tone;

        if (Object.keys(updateData).length === 0) throw new BadRequestException('Nenhum dado para atualizar.');

        const prev = await this.prisma.alphaAI.findUnique({ where: { userId } });
        await this.prisma.alphaAI.update({ where: { userId }, data: updateData });
        return { updated: 'aiPersonality', ...updateData, previousValue: prev };
      }

      case 'accept_friend_request': {
        // Accept by friendshipId (preferred) or by username/userId of requester
        const friendshipId = val('friendshipId', 'requestId', 'id');
        const fromUserId = val('fromUserId', 'userId', 'requesterId');

        let friendship: any = null;

        if (friendshipId) {
          friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
          if (!friendship || friendship.friendId !== userId) {
            throw new BadRequestException('Pedido de amizade não encontrado ou não é para ti.');
          }
        } else if (fromUserId) {
          // Try to resolve username → userId
          let resolvedId = fromUserId;
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromUserId)) {
            const profile = await this.prisma.profile.findFirst({
              where: { username: { equals: fromUserId, mode: 'insensitive' } },
              select: { userId: true },
            });
            if (!profile) throw new BadRequestException(`Utilizador "${fromUserId}" não encontrado.`);
            resolvedId = profile.userId;
          }
          friendship = await this.prisma.friendship.findFirst({
            where: { userId: resolvedId, friendId: userId, status: 'pending' },
          });
          if (!friendship) throw new BadRequestException('Pedido de amizade não encontrado.');
        } else {
          throw new BadRequestException('Fornece o friendshipId ou o fromUserId para aceitar o pedido.');
        }

        await this.prisma.friendship.update({
          where: { id: friendship.id },
          data: { status: 'accepted' },
        });
        return { accepted: 'friendRequest', friendshipId: friendship.id, fromUserId: friendship.userId };
      }

      case 'reject_friend_request': {
        const friendshipId = val('friendshipId', 'requestId', 'id');
        const fromUserId = val('fromUserId', 'userId', 'requesterId');

        let friendship: any = null;

        if (friendshipId) {
          friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
          if (!friendship || friendship.friendId !== userId) {
            throw new BadRequestException('Pedido de amizade não encontrado ou não é para ti.');
          }
        } else if (fromUserId) {
          let resolvedId = fromUserId;
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromUserId)) {
            const profile = await this.prisma.profile.findFirst({
              where: { username: { equals: fromUserId, mode: 'insensitive' } },
              select: { userId: true },
            });
            if (!profile) throw new BadRequestException(`Utilizador "${fromUserId}" não encontrado.`);
            resolvedId = profile.userId;
          }
          friendship = await this.prisma.friendship.findFirst({
            where: { userId: resolvedId, friendId: userId, status: 'pending' },
          });
          if (!friendship) throw new BadRequestException('Pedido de amizade não encontrado.');
        } else {
          throw new BadRequestException('Fornece o friendshipId ou o fromUserId para rejeitar o pedido.');
        }

        await this.prisma.friendship.delete({ where: { id: friendship.id } });
        return { rejected: 'friendRequest', friendshipId: friendship.id };
      }

      case 'read_my_posts': {
        const limit = payload.limit ? Math.min(Number(payload.limit), 20) : 10;
        const posts = await this.prisma.lazerPost.findMany({
          where: { authorId: userId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            reactions: true,
            comments: { where: { deletedAt: null } },
          },
        });
        const formatted = posts.map(p => ({
          id: p.id,
          content: p.content.substring(0, 200),
          reactionCount: p.reactions.length,
          commentCount: p.comments.length,
          createdAt: p.createdAt,
        }));
        return { posts: formatted };
      }

      case 'read_conversations': {
        const limit = payload.limit ? Math.min(Number(payload.limit), 10) : 5;
        const convos = await this.prisma.chatConversation.findMany({
          where: { participants: { some: { id: userId } } },
          orderBy: { lastMessageAt: 'desc' },
          take: limit,
          include: {
            participants: {
              where: { id: { not: userId } },
              select: { id: true, profile: { select: { username: true, displayName: true } } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              include: {
                sender: { select: { id: true, profile: { select: { username: true } } } },
              },
            },
          },
        });
        const formatted = convos.map(c => ({
          id: c.id,
          with: c.participants.map(p => p.profile?.displayName || p.profile?.username || '?'),
          lastMessageAt: c.lastMessageAt,
          recentMessages: c.messages.map(m => ({
            from: m.sender.id === userId ? 'Tu' : (m.sender.profile?.username || '?'),
            content: m.content.substring(0, 100),
          })).reverse(),
        }));
        return { conversations: formatted };
      }

      default:
        throw new BadRequestException(`Acção não implementada: ${actionId}`);
    }
  }
}
