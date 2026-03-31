import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateServerDto, CreateChannelDto } from './dto/community.dto';

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  @Get('servers')
  async list(@CurrentUser() u: { id: string }) {
    return { success: true, data: await this.svc.getMyServers(u.id) };
  }

  @Post('servers')
  async create(@CurrentUser() u: { id: string }, @Body() dto: CreateServerDto) {
    return { success: true, data: await this.svc.createServer(u.id, dto) };
  }

  @Post('servers/join/:code')
  @HttpCode(HttpStatus.OK)
  async join(@CurrentUser() u: { id: string }, @Param('code') code: string) {
    return { success: true, data: await this.svc.joinByInvite(code, u.id) };
  }

  @Get('servers/:id')
  async getOne(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.svc.getServer(id, u.id) };
  }

  @Post('servers/:id/channels')
  async createChannel(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Body() dto: CreateChannelDto) {
    return { success: true, data: await this.svc.createChannel(serverId, u.id, dto) };
  }

  @Get('channels/:id/messages')
  async messages(@CurrentUser() u: { id: string }, @Param('id') channelId: string) {
    return { success: true, data: await this.svc.getMessages(channelId, u.id) };
  }

  @Post('servers/:id/bots/:botId')
  async addBot(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Param('botId') botId: string) {
    return { success: true, data: await this.svc.addBotToServer(serverId, botId, u.id) };
  }
}
