import { Module } from '@nestjs/common';
import { LazerService } from './lazer.service';
import { LazerController } from './lazer.controller';

import { LazerCommunityModule } from './community/lazer-community.module';

@Module({
  imports: [LazerCommunityModule],
  controllers: [LazerController],
  providers: [LazerService],
})
export class LazerModule {}
