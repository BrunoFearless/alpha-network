// Alpha Watch — Watch Module
import { Module } from '@nestjs/common';
import { WatchController } from './watch.controller';
import { WatchService } from './watch.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [WatchController],
  providers: [WatchService, PrismaService],
  exports: [WatchService],
})
export class WatchModule {}
