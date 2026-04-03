import { Module } from '@nestjs/common';
import { PlatformEventsModule } from '../../platform-events/platform-events.module';
import { CommunityModule } from '../community/community.module';
import { BotPlatformController } from './bot-platform.controller';
import { BotPlatformService } from './bot-platform.service';
import { BotTokenGuard } from './bot-token.guard';
import { BotPlatformGateway } from './bot-platform.gateway';
import { BotPlatformEventsBridge } from './bot-platform-events-bridge.service';
import { BotPlatformRateLimitService } from './bot-platform-rate-limit.service';
import { BotPlatformRateLimitGuard } from './bot-platform-rate-limit.guard';

@Module({
  imports: [PlatformEventsModule, CommunityModule],
  controllers: [BotPlatformController],
  providers: [
    BotPlatformService,
    BotTokenGuard,
    BotPlatformRateLimitService,
    BotPlatformRateLimitGuard,
    BotPlatformGateway,
    BotPlatformEventsBridge,
  ],
})
export class BotPlatformModule {}
