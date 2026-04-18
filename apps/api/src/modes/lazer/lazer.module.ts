import { Module } from '@nestjs/common';
import { LazerService } from './lazer.service';
import { LazerController } from './lazer.controller';
import { SpotifyService } from './spotify.service';

import { LazerCommunityModule } from './community/lazer-community.module';

@Module({
  imports: [LazerCommunityModule],
  controllers: [LazerController],
  providers: [LazerService, SpotifyService],
})
export class LazerModule {}
