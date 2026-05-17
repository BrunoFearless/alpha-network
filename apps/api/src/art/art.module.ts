import { Module } from '@nestjs/common';
import { ArtController } from './art.controller';
import { ArtService } from './art.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContentModerationService } from './content-moderation.service';

@Module({
  controllers: [ArtController],
  providers: [ArtService, PrismaService, ContentModerationService],
  exports: [ArtService, ContentModerationService],
})
export class ArtModule {}
