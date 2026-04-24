// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/alpha-core/alpha-core.service.ts
// ════════════════════════════════════════════════════════════════════════════

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

// ── Action definitions ─────────────────────────────────────────────────────

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  requiredPermission: keyof PermissionMap;
  riskLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
}

export interface PermissionMap {
  canEditProfile: boolean;
  canCreatePosts: boolean;
  canDeletePosts: boolean;
  canManageFriends: boolean;
  canEditTheme: boolean;
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
    id: 'update_name_style',
    label: 'Alterar estilo do nome',
    description: 'Muda a fonte, efeito e cor do nome no perfil',
    requiredPermission: 'canEditTheme',
    riskLevel: 'low',
    reversible: true,
  },
];

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class AlphaCoreService {
  private anthropic: Anthropic;

  constructor(private readonly prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ── Chat proxy (Fase 1 + 2) ─────────────────────────────────────────────

  async chat(
    userId: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    tools?: any[],
  ) {
    const params: any = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    // Non-streaming response for simplicity; for streaming use Anthropic SDK's stream()
    const response = await this.anthropic.messages.create(params);
    return response;
  }

  // ── Streaming chat proxy ─────────────────────────────────────────────────

  async *chatStream(
    messages: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    tools?: any[],
  ): AsyncIterable<string> {
    const params: any = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    const stream = await this.anthropic.messages.stream(params);

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  // ── Permissions ─────────────────────────────────────────────────────────

  async getPermissions(userId: string): Promise<PermissionMap> {
    const perms = await this.prisma.alphaCorePermission.findUnique({
      where: { userId },
    });

    if (!perms) {
      // Default: no permissions
      return {
        canEditProfile: false,
        canCreatePosts: false,
        canDeletePosts: false,
        canManageFriends: false,
        canEditTheme: false,
      };
    }

    return {
      canEditProfile: perms.canEditProfile,
      canCreatePosts: perms.canCreatePosts,
      canDeletePosts: perms.canDeletePosts,
      canManageFriends: perms.canManageFriends,
      canEditTheme: perms.canEditTheme,
    };
  }

  async updatePermissions(
    userId: string,
    permissions: Partial<PermissionMap>,
  ) {
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
      },
      update: {
        canEditProfile: false,
        canCreatePosts: false,
        canDeletePosts: false,
        canManageFriends: false,
        canEditTheme: false,
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

    // Check permission
    const perms = await this.getPermissions(userId);
    if (!perms[actionDef.requiredPermission]) {
      throw new ForbiddenException(
        `Não tens permissão para: ${actionDef.label}. Activa-a nas definições da Alpha Core.`,
      );
    }

    // Create pending action record
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

    // Mark as confirmed
    await this.prisma.alphaCoreAction.update({
      where: { id: actionRecordId },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    // Execute
    try {
      const result = await this.executeAction(userId, record.action, record.payload as any);

      await this.prisma.alphaCoreAction.update({
        where: { id: actionRecordId },
        data: { status: 'executed', executedAt: new Date(), result },
      });

      return { success: true, result, actionId: actionRecordId };
    } catch (e: any) {
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

    // Revert logic — restore previous state from payload.previousValue
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

  // ── Private: Execute action on platform ─────────────────────────────────

  private async executeAction(
    userId: string,
    actionId: string,
    payload: Record<string, any>,
  ): Promise<any> {
    switch (actionId) {
      case 'update_display_name': {
        // Save previous value for revert
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { displayName: true } });
        await this.prisma.profile.update({
          where: { userId },
          data: { displayName: payload.value },
        });
        return { updated: 'displayName', value: payload.value, previousValue: prev?.displayName };
      }

      case 'update_bio': {
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { bio: true } });
        await this.prisma.profile.update({
          where: { userId },
          data: { bio: payload.value },
        });
        return { updated: 'bio', value: payload.value, previousValue: prev?.bio };
      }

      case 'update_status': {
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { status: true } });
        await this.prisma.profile.update({
          where: { userId },
          data: { status: payload.value },
        });
        return { updated: 'status', value: payload.value, previousValue: prev?.status };
      }

      case 'update_theme_color': {
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { lazerData: true } });
        const prevLazerData = (prev?.lazerData as any) ?? {};
        await this.prisma.profile.update({
          where: { userId },
          data: { lazerData: { ...prevLazerData, themeColor: payload.value } },
        });
        return { updated: 'themeColor', value: payload.value, previousValue: prevLazerData.themeColor };
      }

      case 'update_banner_color': {
        const prev = await this.prisma.profile.findUnique({ where: { userId }, select: { bannerColor: true } });
        await this.prisma.profile.update({
          where: { userId },
          data: { bannerColor: payload.value },
        });
        return { updated: 'bannerColor', value: payload.value, previousValue: prev?.bannerColor };
      }

      case 'update_name_style': {
        const updateData: any = {};
        if (payload.nameFont)   updateData.nameFont   = payload.nameFont;
        if (payload.nameEffect) updateData.nameEffect = payload.nameEffect;
        if (payload.nameColor)  updateData.nameColor  = payload.nameColor;
        await this.prisma.profile.update({ where: { userId }, data: updateData });
        return { updated: 'nameStyle', ...payload };
      }

      case 'create_post': {
        const post = await this.prisma.lazerPost.create({
          data: {
            authorId: userId,
            content: payload.content,
            tag: payload.tag ?? null,
            isSparkle: payload.isSparkle ?? false,
            titleFont: payload.titleFont ?? null,
            titleColor: payload.titleColor ?? null,
          },
        });
        return { created: 'post', postId: post.id };
      }

      case 'delete_post': {
        const post = await this.prisma.lazerPost.findUnique({ where: { id: payload.postId } });
        if (!post || post.authorId !== userId) throw new ForbiddenException('Post não encontrado ou não pertence ao utilizador.');
        await this.prisma.lazerPost.update({
          where: { id: payload.postId },
          data: { deletedAt: new Date() },
        });
        return { deleted: 'post', postId: payload.postId };
      }

      case 'send_friend_request': {
        const existing = await this.prisma.friendRequest.findFirst({
          where: {
            OR: [
              { fromUserId: userId, toUserId: payload.toUserId },
              { fromUserId: payload.toUserId, toUserId: userId },
            ],
          },
        });
        if (existing) return { skipped: 'already_exists', requestId: existing.id };
        const req = await this.prisma.friendRequest.create({
          data: { fromUserId: userId, toUserId: payload.toUserId, status: 'pending' },
        });
        return { created: 'friendRequest', requestId: req.id };
      }

      default:
        throw new BadRequestException(`Acção não implementada: ${actionId}`);
    }
  }
}
