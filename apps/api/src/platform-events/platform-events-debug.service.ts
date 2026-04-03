import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from './event-bus.service';

/** Regista eventos da plataforma em modo debug (PLATFORM_EVENTS_DEBUG=1 ou NODE_ENV=development). */
@Injectable()
export class PlatformEventsDebugService implements OnModuleInit {
  private readonly log = new Logger('PlatformEvents');

  constructor(
    private readonly bus: EventBusService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const explicit = this.config.get<string>('PLATFORM_EVENTS_DEBUG') === '1';
    const dev = this.config.get<string>('NODE_ENV') === 'development';
    if (!explicit && !dev) return;
    this.bus.subscribeAll(ev => {
      this.log.debug(JSON.stringify(ev));
    });
  }
}
