import { Module } from '@nestjs/common';
import { WatchController } from './watch.controller';
import { WatchService } from './watch.service';
import { PrismaService } from '../prisma/prisma.service';
import { WatchPartyGateway } from './watch.gateway';

@Module({
  controllers: [WatchController],
  providers: [WatchService, PrismaService, WatchPartyGateway],
  exports: [WatchService],
})
export class WatchModule {}
