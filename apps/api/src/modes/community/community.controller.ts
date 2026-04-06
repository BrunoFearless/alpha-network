import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateServerDto,
  CreateChannelDto,
  CreateCategoryDto,
  UpdateServerDto,
  CreateCommunityRoleDto,
  UpdateCommunityRoleDto,
  AssignMemberRoleDto,
  UpdateServerBotDto,
  EditMessageDto,
  ToggleReactionDto,
} from './dto/community.dto';

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

  @Delete('servers/:id/members/me')
  @HttpCode(HttpStatus.OK)
  async leaveServer(@CurrentUser() u: { id: string }, @Param('id') serverId: string) {
    return { success: true, data: await this.svc.leaveServer(serverId, u.id) };
  }

  @Get('servers/:id')
  async getOne(@CurrentUser() u: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.svc.getServer(id, u.id) };
  }

  @Patch('servers/:id')
  async patchServer(@CurrentUser() u: { id: string }, @Param('id') id: string, @Body() dto: UpdateServerDto) {
    return { success: true, data: await this.svc.updateServer(id, u.id, dto) };
  }

  @Post('servers/:id/categories')
  async createCategory(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Body() dto: CreateCategoryDto) {
    return { success: true, data: await this.svc.createCategory(serverId, u.id, dto) };
  }

  @Post('servers/:id/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() u: { id: string },
    @Param('id') serverId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { success: true, data: await this.svc.saveCommunityUpload(serverId, u.id, file) };
  }

  @Get('servers/:id/audit')
  async audit(@CurrentUser() u: { id: string }, @Param('id') serverId: string) {
    return { success: true, data: await this.svc.listAuditLogs(serverId, u.id) };
  }

  @Post('servers/:id/channels')
  async createChannel(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Body() dto: CreateChannelDto) {
    return { success: true, data: await this.svc.createChannel(serverId, u.id, dto) };
  }

  @Get('servers/:id/roles')
  async listRoles(@CurrentUser() u: { id: string }, @Param('id') serverId: string) {
    return { success: true, data: await this.svc.listRoles(serverId, u.id) };
  }

  @Post('servers/:id/roles')
  async createRole(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Body() dto: CreateCommunityRoleDto) {
    return { success: true, data: await this.svc.createRole(serverId, u.id, dto) };
  }

  @Patch('servers/:id/roles/:roleId')
  async updateRole(
    @CurrentUser() u: { id: string },
    @Param('id') serverId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateCommunityRoleDto,
  ) {
    return { success: true, data: await this.svc.updateRole(serverId, roleId, u.id, dto) };
  }

  @Delete('servers/:id/roles/:roleId')
  async deleteRole(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Param('roleId') roleId: string) {
    return { success: true, data: await this.svc.deleteRole(serverId, roleId, u.id) };
  }

  @Patch('servers/:id/members/:userId/role')
  async assignRole(
    @CurrentUser() u: { id: string },
    @Param('id') serverId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: AssignMemberRoleDto,
  ) {
    return { success: true, data: await this.svc.assignMemberRole(serverId, targetUserId, u.id, dto) };
  }

  @Delete('servers/:id/members/:userId')
  async kick(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Param('userId') targetUserId: string) {
    return { success: true, data: await this.svc.kickMember(serverId, targetUserId, u.id) };
  }

  @Post('servers/:id/ban/:userId')
  @HttpCode(HttpStatus.OK)
  async ban(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Param('userId') targetUserId: string) {
    return { success: true, data: await this.svc.banMember(serverId, targetUserId, u.id) };
  }

  @Delete('servers/:id/ban/:userId')
  async unban(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Param('userId') targetUserId: string) {
    return { success: true, data: await this.svc.unbanMember(serverId, targetUserId, u.id) };
  }

  @Patch('servers/:id/bots/:botId')
  async patchServerBot(
    @CurrentUser() u: { id: string },
    @Param('id') serverId: string,
    @Param('botId') botId: string,
    @Body() dto: UpdateServerBotDto,
  ) {
    return { success: true, data: await this.svc.updateServerBot(serverId, botId, u.id, dto.isAdminBot) };
  }

  @Get('channels/:id/messages')
  async messages(@CurrentUser() u: { id: string }, @Param('id') channelId: string) {
    return { success: true, data: await this.svc.getMessages(channelId, u.id) };
  }

  @Get('channels/:id/pins')
  async pins(@CurrentUser() u: { id: string }, @Param('id') channelId: string) {
    return { success: true, data: await this.svc.listPins(channelId, u.id) };
  }

  @Post('channels/:id/pins/:messageId')
  @HttpCode(HttpStatus.OK)
  async pin(
    @CurrentUser() u: { id: string },
    @Param('id') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return { success: true, data: await this.svc.pinMessage(channelId, messageId, u.id) };
  }

  @Delete('channels/:id/pins/:messageId')
  async unpin(
    @CurrentUser() u: { id: string },
    @Param('id') channelId: string,
    @Param('messageId') messageId: string,
  ) {
    return { success: true, data: await this.svc.unpinMessage(channelId, messageId, u.id) };
  }

  @Patch('messages/:messageId')
  async editMessage(
    @CurrentUser() u: { id: string },
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return { success: true, data: await this.svc.editMessage(messageId, u.id, dto.content) };
  }

  @Post('messages/:messageId/reactions')
  @HttpCode(HttpStatus.OK)
  async reaction(
    @CurrentUser() u: { id: string },
    @Param('messageId') messageId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return { success: true, data: await this.svc.toggleReaction(messageId, u.id, dto.emoji) };
  }

  @Delete('messages/:messageId')
  async deleteMessage(@CurrentUser() u: { id: string }, @Param('messageId') messageId: string) {
    return { success: true, data: await this.svc.deleteMessage(messageId, u.id) };
  }

  @Post('servers/:id/bots/:botId')
  async addBot(@CurrentUser() u: { id: string }, @Param('id') serverId: string, @Param('botId') botId: string) {
    return { success: true, data: await this.svc.addBotToServer(serverId, botId, u.id) };
  }
}