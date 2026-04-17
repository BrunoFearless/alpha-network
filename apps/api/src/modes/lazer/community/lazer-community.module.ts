import { Module } from '@nestjs/common';
import { LazerCommunityService } from './lazer-community.service';
import { LazerCommunityController } from './lazer-community.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

import { MediaService } from '../../../common/services/media.service';

@Module({
  imports: [PrismaModule],
  providers: [LazerCommunityService, MediaService],
  controllers: [LazerCommunityController],
  exports: [LazerCommunityService],
})
export class LazerCommunityModule {}
