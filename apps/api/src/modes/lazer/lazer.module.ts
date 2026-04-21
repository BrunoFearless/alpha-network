import { Module } from '@nestjs/common';
import { LazerService } from './lazer.service';
import { LazerController } from './lazer.controller';
import { SpotifyService } from './spotify.service';
import { DiscoverService } from './discover.service';
import { ProxyService } from './proxy.service';

import { LazerCommunityModule } from './community/lazer-community.module';

@Module({
  imports: [LazerCommunityModule],
  controllers: [LazerController],
  providers: [LazerService, SpotifyService, DiscoverService, ProxyService],
})
export class LazerModule {}
