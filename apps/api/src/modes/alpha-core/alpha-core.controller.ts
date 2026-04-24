// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/modes/alpha-core/alpha-core.controller.ts
// ════════════════════════════════════════════════════════════════════════════

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Res,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AlphaCoreService, ALLOWED_ACTIONS } from './alpha-core.service';
import { AlphaAIService } from './alpha-ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { IsArray, IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';

// ── DTOs ───────────────────────────────────────────────────────────────────

class ChatDto {
  @IsArray()
  messages: { role: 'user' | 'assistant'; content: string }[];

  @IsString()
  @IsOptional()
  systemPrompt: string;

  @IsArray()
  @IsOptional()
  tools?: any[];
}

class RequestActionDto {
  @IsString()
  actionId: string;

  @IsObject()
  @IsOptional()
  payload: Record<string, any>;
}

class UpdatePermissionsDto {
  @IsBoolean()
  @IsOptional()
  canEditProfile?: boolean;

  @IsBoolean()
  @IsOptional()
  canCreatePosts?: boolean;

  @IsBoolean()
  @IsOptional()
  canDeletePosts?: boolean;

  @IsBoolean()
  @IsOptional()
  canManageFriends?: boolean;

  @IsBoolean()
  @IsOptional()
  canEditTheme?: boolean;
}

// ── Controller ─────────────────────────────────────────────────────────────

@Controller('alpha')
@UseGuards(JwtAuthGuard)
export class AlphaCoreController {
  constructor(
    private readonly alphaCoreService: AlphaCoreService,
    private readonly alphaAIService: AlphaAIService,
  ) {}

  // ── Chat proxy (protege a API key no servidor) ─────────────────────────

  /**
   * POST /api/v1/alpha/chat
   * Proxy seguro para a API Anthropic — a chave nunca sai do servidor.
   */
  @Post('chat')
  async chat(
    @Body() dto: ChatDto,
    @Res() res: Response,
    @CurrentUser() user: { id: string },
  ) {
    console.log('[AlphaCoreController] Incoming chat request:', {
      userId: user.id,
      messagesCount: dto?.messages?.length,
      hasSystemPrompt: !!dto?.systemPrompt,
      hasTools: !!dto?.tools?.length
    });

    if (!dto?.messages || !Array.isArray(dto.messages)) {
      console.error('[AlphaCoreController] messages is missing or not an array:', dto?.messages);
      res.status(400).json({ error: 'messages must be an array' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    let finalSystemPrompt = dto.systemPrompt;
    
    // Check if user has a Personal AI to override Alpha Core
    try {
      const myAI = await this.alphaAIService.getMyAI(user.id);
      if (myAI && myAI.isActive) {
        const aiPrompt = this.alphaAIService.buildSystemPrompt(myAI);
        const toolsRule = `\n\n### REGRAS ESTritas DE FERRAMENTAS (TOOLS)
1. Estás numa conversa normal. NUNCA tentes usar ferramentas a não ser que o utilizador DÊ UMA ORDEM CLARA (ex: "Muda o meu status para X" ou "Cria um post a dizer Y").
2. Se o utilizador apenas comentar o seu estado ou fizer uma pergunta, RESPONDE SEMPRE APENAS COM TEXTO.
3. Se o sistema te devolver um erro de permissão, não quebres a tua personalidade. Responde naturalmente ou diz ao utilizador que ele precisa de ativar a permissão nas definições, mas sempre com a tua voz e personalidade.`;
        finalSystemPrompt = aiPrompt + toolsRule;
      }
    } catch (e) {
      console.error('[AlphaCoreController] Erro ao buscar IA pessoal:', e);
    }

    try {
      for await (const event of this.alphaCoreService.chatStream(
        user.id,
        dto.messages,
        finalSystemPrompt,
        dto.tools,
      )) {
        if (event.type === 'text') {
          res.write(`data: ${JSON.stringify({ text: event.text })}\n\n`);
        } else if (event.type === 'action') {
          res.write(`data: ${JSON.stringify({ action: event.action })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
    } catch (e: any) {
      console.error('[AlphaCoreController] Stream error:', e);
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
