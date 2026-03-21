import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [BotsService, PrismaService],
  exports: [BotsService],
})
export class BotsModule {}
