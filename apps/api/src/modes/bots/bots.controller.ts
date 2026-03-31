import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BotsService } from './bots.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBotDto, AddCommandDto } from './dto/bots.dto';

@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private readonly svc: BotsService) {}

  @Get()
  async list(@CurrentUser() u: { id: string }) { return { success: true, data: await this.svc.listMine(u.id) }; }

  @Post()
  async create(@CurrentUser() u: { id: string }, @Body() dto: CreateBotDto) { return { success: true, data: await this.svc.create(u.id, dto) }; }

  @Get(':id')
  async getOne(@CurrentUser() u: { id: string }, @Param('id') id: string) { return { success: true, data: await this.svc.getOne(id, u.id) }; }

  @Post(':id/commands')
  async addCmd(@CurrentUser() u: { id: string }, @Param('id') botId: string, @Body() dto: AddCommandDto) { return { success: true, data: await this.svc.addCommand(botId, u.id, dto) }; }

  @Delete('commands/:id')
  async removeCmd(@CurrentUser() u: { id: string }, @Param('id') id: string) { await this.svc.removeCommand(id, u.id); return { success: true }; }
}
