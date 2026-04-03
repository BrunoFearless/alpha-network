import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BotTokenGuard } from './bot-token.guard';
import { BotPlatformRateLimitGuard } from './bot-platform-rate-limit.guard';
import { BotPlatformService } from './bot-platform.service';
import { BotPatchMemberDto, BotPostMessageDto } from './dto/platform-bot.dto';

@Controller('platform/bot')
@UseGuards(BotTokenGuard, BotPlatformRateLimitGuard)
export class BotPlatformController {
  constructor(private readonly svc: BotPlatformService) {}

  @Post('messages')
  async postMessage(@Req() req: { bot: { id: string } }, @Body() dto: BotPostMessageDto) {
    return {
      success: true,
      data: await this.svc.postMessage(req.bot.id, dto.channelId, dto.content, dto.replyToId),
    };
  }

  @Delete('messages/:messageId')
  async deleteMessage(@Req() req: { bot: { id: string } }, @Param('messageId') messageId: string) {
    return { success: true, data: await this.svc.deleteOwnMessage(req.bot.id, messageId) };
  }

  @Get('channels')
  async listChannels(@Req() req: { bot: { id: string } }, @Query('serverId') serverId: string) {
    if (!serverId?.trim()) throw new BadRequestException('serverId é obrigatório.');
    return { success: true, data: await this.svc.listChannels(req.bot.id, serverId) };
  }

  @Patch('members/:userId')
  async patchMember(
    @Req() req: { bot: { id: string } },
    @Param('userId') userId: string,
    @Body() dto: BotPatchMemberDto,
  ) {
    return {
      success: true,
      data: await this.svc.patchMemberRole(req.bot.id, userId, dto.serverId, dto.communityRoleId ?? null),
    };
  }
}
