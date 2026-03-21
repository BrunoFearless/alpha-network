import { Module } from '@nestjs/common';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [CreatorController],
  providers: [CreatorService, PrismaService],
})
export class CreatorModule {}
