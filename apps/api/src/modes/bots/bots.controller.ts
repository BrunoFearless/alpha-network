import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BotsService } from './bots.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBotDto, AddCommandDto, UpdateBotDto } from './dto/bots.dto';

@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private readonly svc: BotsService) {}

  @Get()
  async list(@CurrentUser() u: { id: string }) { return { success: true, data: await this.svc.listMine(u.id) }; }

  @Post()
  async create(@CurrentUser() u: { id: string }, @Body() dto: CreateBotDto) { return { success: true, data: await this.svc.create(u.id, dto) }; }

  @Get('marketplace')
  async marketplace(@CurrentUser() _u: { id: string }) {
    return { success: true, data: await this.svc.listMarketplace() };
  }

  @Get(':id/debug/executions')
  async executionLogs(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Query('take') take?: string,
  ) {
    const t = take ? Math.min(100, Math.max(1, parseInt(take, 10) || 40)) : 40;
    return { success: true, data: await this.svc.listExecutionLogs(id, u.id, t) };
  }

  @Get(':id')
  async getOne(@CurrentUser() u: { id: string }, @Param('id') id: string) { return { success: true, data: await this.svc.getOne(id, u.id) }; }

  @Patch(':id')
  async update(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dto: UpdateBotDto) {
    return { success: true, data: await this.svc.update(id, u.id, dto) };
  }

  @Post(':id/commands')
  async addCmd(@CurrentUser() u: { id: string }, @Param('id') botId: string, @Body() dto: AddCommandDto) { return { success: true, data: await this.svc.addCommand(botId, u.id, dto) }; }

  @Delete('commands/:id')
  async removeCmd(@CurrentUser() u: { id: string }, @Param('id') id: string) { await this.svc.removeCommand(id, u.id); return { success: true }; }
}
