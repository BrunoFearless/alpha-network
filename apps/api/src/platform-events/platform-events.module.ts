import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventBusService } from './event-bus.service';
import { PlatformEventsDebugService } from './platform-events-debug.service';
import { WorkerDispatchService } from './worker-dispatch.service';

@Module({
  imports: [ConfigModule],
  providers: [EventBusService, PlatformEventsDebugService, WorkerDispatchService],
  exports: [EventBusService, WorkerDispatchService],
})
export class PlatformEventsModule {}
