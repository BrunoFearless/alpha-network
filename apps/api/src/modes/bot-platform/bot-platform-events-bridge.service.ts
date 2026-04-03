import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../platform-events/event-bus.service';
import { PlatformEvent } from '../../platform-events/platform-events.types';
import { BotPlatformGateway } from './bot-platform.gateway';

@Injectable()
export class BotPlatformEventsBridge implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly gateway: BotPlatformGateway,
  ) {}

  onModuleInit() {
    this.bus.subscribeAll((ev: PlatformEvent) => {
      if ('serverId' in ev) this.gateway.emitToServer(ev.serverId, ev);
    });
  }
}
