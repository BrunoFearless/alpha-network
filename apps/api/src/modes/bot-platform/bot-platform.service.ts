import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityService } from '../community/community.service';

@Injectable()
export class BotPlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly community: CommunityService,
  ) {}

  async assertBotOnServer(botId: string, serverId: string) {
    const row = await this.prisma.serverBot.findUnique({
      where: { serverId_botId: { serverId, botId } },
    });
    if (!row) throw new ForbiddenException('Bot não está neste servidor.');
    return row;
  }

  async listChannels(botId: string, serverId: string) {
    await this.assertBotOnServer(botId, serverId);
    return this.prisma.channel.findMany({
      where: { serverId },
      orderBy: [{ categoryId: 'asc' }, { position: 'asc' }],
      select: { id: true, name: true, type: true, position: true, categoryId: true },
    });
  }

  async postMessage(
    botId: string,
    channelId: string,
    content: string,
    replyToId?: string | null,
  ) {
    const ch = await this.prisma.channel.findUnique({ where: { id: channelId }, select: { serverId: true } });
    if (!ch) throw new NotFoundException('Canal não encontrado.');
    await this.assertBotOnServer(botId, ch.serverId);
    return this.community.saveMessage(channelId, botId, 'bot', content.trim(), {
      replyToId: replyToId ?? null,
    });
  }

  async deleteOwnMessage(botId: string, messageId: string) {
    return this.community.deleteMessageAsBot(messageId, botId);
  }

  async patchMemberRole(botId: string, targetUserId: string, serverId: string, communityRoleId: string | null) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: { ownerId: true } });
    if (!bot) throw new NotFoundException('Bot não encontrado.');
    await this.assertBotOnServer(botId, serverId);
    return this.community.assignMemberRole(serverId, targetUserId, bot.ownerId, { communityRoleId: communityRoleId ?? null });
  }
}
