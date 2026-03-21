import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [CommunityController],
  providers: [CommunityService, PrismaService],
})
export class CommunityModule {}
