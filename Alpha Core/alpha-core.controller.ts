// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/alpha-core/alpha-core.controller.ts
// ════════════════════════════════════════════════════════════════════════════

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, Res,
  HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AlphaCoreService, ALLOWED_ACTIONS } from './alpha-core.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── DTOs ───────────────────────────────────────────────────────────────────

class ChatDto {
  messages: { role: 'user' | 'assistant'; content: string }[];
  systemPrompt: string;
  tools?: any[];
}

class RequestActionDto {
  actionId: string;
  payload: Record<string, any>;
}

class UpdatePermissionsDto {
  canEditProfile?: boolean;
  canCreatePosts?: boolean;
  canDeletePosts?: boolean;
  canManageFriends?: boolean;
  canEditTheme?: boolean;
}

// ── Controller ─────────────────────────────────────────────────────────────

@Controller('alpha')
@UseGuards(JwtAuthGuard)
export class AlphaCoreController {
  constructor(private readonly alphaCoreService: AlphaCoreService) {}

  // ── Chat proxy (protege a API key no servidor) ─────────────────────────

  /**
   * POST /api/v1/alpha/chat
   * Proxy seguro para a API Anthropic — a chave nunca sai do servidor.
   * O frontend envia messages + systemPrompt → este endpoint chama Anthropic
   * e retorna a resposta em texto-plano (Server-Sent Events para streaming).
   */
  @Post('chat')
  async chat(
    @Body() dto: ChatDto,
    @Res() res: Response,
    @CurrentUser() user: { id: string },
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    try {
      for await (const chunk of this.alphaCoreService.chatStream(
        dto.messages,
        dto.systemPrompt,
        dto.tools,
      )) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    } finally {
      res.end();
    }
  }

  // ── Permissions ────────────────────────────────────────────────────────

  /** GET /api/v1/alpha/permissions — Obter permissões actuais */
  @Get('permissions')
  async getPermissions(@CurrentUser() user: { id: string }) {
    const permissions = await this.alphaCoreService.getPermissions(user.id);
    const actions = ALLOWED_ACTIONS.map(a => ({
      ...a,
      enabled: permissions[a.requiredPermission],
    }));
    return { success: true, data: { permissions, availableActions: actions } };
  }

  /** PATCH /api/v1/alpha/permissions — Actualizar permissões */
  @Patch('permissions')
  async updatePermissions(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePermissionsDto,
  ) {
    const updated = await this.alphaCoreService.updatePermissions(user.id, dto);
    return { success: true, data: updated };
  }

  /** DELETE /api/v1/alpha/permissions — Revogar todas as permissões */
  @Delete('permissions')
  @HttpCode(HttpStatus.OK)
  async revokeAllPermissions(@CurrentUser() user: { id: string }) {
    await this.alphaCoreService.revokeAllPermissions(user.id);
    return { success: true, message: 'Todas as permissões da Alpha Core foram revogadas.' };
  }

  // ── Actions ────────────────────────────────────────────────────────────

  /** GET /api/v1/alpha/actions — Lista de acções disponíveis */
  @Get('actions')
  getAvailableActions() {
    return { success: true, data: ALLOWED_ACTIONS };
  }

  /**
   * POST /api/v1/alpha/actions/request
   * Alpha Core pede para executar uma acção → fica em "pending" até confirmação
   */
  @Post('actions/request')
  @HttpCode(HttpStatus.CREATED)
  async requestAction(
    @CurrentUser() user: { id: string },
    @Body() dto: RequestActionDto,
  ) {
    const result = await this.alphaCoreService.requestAction(
      user.id,
      dto.actionId,
      dto.payload,
    );
    return { success: true, data: result };
  }

  /**
   * POST /api/v1/alpha/actions/:id/confirm
   * Utilizador confirma a acção → executa imediatamente
   */
  @Post('actions/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmAction(
    @CurrentUser() user: { id: string },
    @Param('id') actionId: string,
  ) {
    const result = await this.alphaCoreService.confirmAndExecuteAction(
      user.id,
      actionId,
    );
    return { success: true, data: result };
  }

  /**
   * POST /api/v1/alpha/actions/:id/reject
   * Utilizador recusa a acção proposta pela Alpha Core
   */
  @Post('actions/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectAction(
    @CurrentUser() user: { id: string },
    @Param('id') actionId: string,
  ) {
    await this.alphaCoreService.rejectAction(user.id, actionId);
    return { success: true, message: 'Acção recusada.' };
  }

  /**
   * POST /api/v1/alpha/actions/:id/revert
   * Utilizador desfaz uma acção executada (se reversível)
   */
  @Post('actions/:id/revert')
  @HttpCode(HttpStatus.OK)
  async revertAction(
    @CurrentUser() user: { id: string },
    @Param('id') actionId: string,
  ) {
    const result = await this.alphaCoreService.revertAction(user.id, actionId);
    return { success: true, data: result };
  }

  // ── History ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/alpha/history
   * Histórico completo de acções da Alpha Core para o utilizador
   */
  @Get('history')
  async getHistory(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    const history = await this.alphaCoreService.getActionHistory(
      user.id,
      limit ? parseInt(limit, 10) : 20,
    );
    return { success: true, data: history };
  }
}
