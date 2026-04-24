// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/alpha-core/alpha-ai.controller.ts
// ════════════════════════════════════════════════════════════════════════════

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AlphaAIService, CreateAlphaAIDto, TrainingExample, KnowledgeEntry, TriggerWord } from './alpha-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('alpha/ai')
export class AlphaAIController {
  constructor(private readonly alphaAIService: AlphaAIService) {}

  // ── Perfil pessoal ─────────────────────────────────────────────────────

  /** GET /api/v1/alpha/ai/me — Obter a minha IA */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyAI(@CurrentUser() user: { id: string }) {
    const ai = await this.alphaAIService.getMyAI(user.id);
    return { success: true, data: ai };
  }

  /** POST /api/v1/alpha/ai — Criar a minha IA */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAI(@CurrentUser() user: { id: string }, @Body() dto: CreateAlphaAIDto) {
    const ai = await this.alphaAIService.createAI(user.id, dto);
    return { success: true, data: ai };
  }

  /** PATCH /api/v1/alpha/ai — Actualizar a minha IA */
  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateAI(@CurrentUser() user: { id: string }, @Body() dto: Partial<CreateAlphaAIDto>) {
    const ai = await this.alphaAIService.updateAI(user.id, dto);
    return { success: true, data: ai };
  }

  /** DELETE /api/v1/alpha/ai — Apagar a minha IA */
  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAI(@CurrentUser() user: { id: string }) {
    await this.alphaAIService.deleteAI(user.id);
    return { success: true, message: 'IA eliminada.' };
  }

  // ── System prompt gerado ───────────────────────────────────────────────

  /** GET /api/v1/alpha/ai/me/prompt — Ver o system prompt gerado */
  @Get('me/prompt')
  @UseGuards(JwtAuthGuard)
  async getPrompt(@CurrentUser() user: { id: string }) {
    const ai = await this.alphaAIService.getMyAI(user.id);
    if (!ai) return { success: false, error: 'IA não encontrada.' };
    const prompt = this.alphaAIService.buildSystemPrompt(ai);
    return { success: true, data: { prompt, tokenCount: Math.ceil(prompt.length / 4) } };
  }

  // ── Validação de botname ───────────────────────────────────────────────

  /** GET /api/v1/alpha/ai/check-botname?name=xxx */
  @Get('check-botname')
  async checkBotname(@Query('name') name: string) {
    const result = await this.alphaAIService.checkBotnameAvailable(name);
    return { success: true, data: result };
  }

  // ── Exemplos de treino ─────────────────────────────────────────────────

  /** POST /api/v1/alpha/ai/training — Adicionar exemplo */
  @Post('training')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addTraining(@CurrentUser() user: { id: string }, @Body() dto: TrainingExample) {
    const ai = await this.alphaAIService.addTrainingExample(user.id, dto);
    return { success: true, data: ai };
  }

  /** DELETE /api/v1/alpha/ai/training/:index — Remover exemplo por índice */
  @Delete('training/:index')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeTraining(
    @CurrentUser() user: { id: string },
    @Param('index') index: string,
  ) {
    const ai = await this.alphaAIService.removeTrainingExample(user.id, parseInt(index, 10));
    return { success: true, data: ai };
  }

  // ── Conhecimento ───────────────────────────────────────────────────────

  /** POST /api/v1/alpha/ai/knowledge */
  @Post('knowledge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addKnowledge(@CurrentUser() user: { id: string }, @Body() dto: KnowledgeEntry) {
    const ai = await this.alphaAIService.addKnowledgeEntry(user.id, dto);
    return { success: true, data: ai };
  }

  /** DELETE /api/v1/alpha/ai/knowledge/:index */
  @Delete('knowledge/:index')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeKnowledge(
    @CurrentUser() user: { id: string },
    @Param('index') index: string,
  ) {
    const ai = await this.alphaAIService.removeKnowledgeEntry(user.id, parseInt(index, 10));
    return { success: true, data: ai };
  }

  // ── Palavras-gatilho ───────────────────────────────────────────────────

  /** POST /api/v1/alpha/ai/triggers */
  @Post('triggers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addTrigger(@CurrentUser() user: { id: string }, @Body() dto: TriggerWord) {
    const ai = await this.alphaAIService.addTriggerWord(user.id, dto);
    return { success: true, data: ai };
  }

  // ── Perfis públicos ────────────────────────────────────────────────────

  /** GET /api/v1/alpha/ai/discover — Descobrir IAs públicas */
  @Get('discover')
  async discover(@Query('limit') limit?: string) {
    const ais = await this.alphaAIService.discoverPublicAIs(limit ? parseInt(limit, 10) : 20);
    return { success: true, data: ais };
  }

  /** GET /api/v1/alpha/ai/:botname — Perfil público de uma IA */
  @Get(':botname')
  async getPublicAI(@Param('botname') botname: string) {
    const ai = await this.alphaAIService.getPublicAI(botname);
    return { success: true, data: ai };
  }
}
