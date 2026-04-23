import { Module } from '@nestjs/common';
import { AlphaCoreService } from './alpha-core.service';
import { AlphaCoreController } from './alpha-core.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AlphaCoreController],
  providers: [AlphaCoreService, PrismaService],
  exports: [AlphaCoreService],
})
export class AlphaCoreModule {}
