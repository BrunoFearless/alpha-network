import { Injectable, Logger } from '@nestjs/common';
import { PlatformEvent, PlatformEventType } from './platform-events.types';

type Handler = (event: PlatformEvent) => void;

@Injectable()
export class EventBusService {
  private readonly log = new Logger(EventBusService.name);
  private readonly byType = new Map<PlatformEventType, Set<Handler>>();
  private readonly all = new Set<Handler>();

  /** Subscreve um tipo específico. Devolve função para cancelar. */
  subscribe(type: PlatformEventType, handler: Handler): () => void {
    let set = this.byType.get(type);
    if (!set) {
      set = new Set();
      this.byType.set(type, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.byType.delete(type);
    };
  }

  /** Recebe todos os eventos (útil para engine / debug). */
  subscribeAll(handler: Handler): () => void {
    this.all.add(handler);
    return () => this.all.delete(handler);
  }

  publish(event: PlatformEvent): void {
    const run = (h: Handler) => {
      try {
        h(event);
      } catch (e) {
        this.log.warn(`handler failed for ${event.type}: ${(e as Error)?.message ?? e}`);
      }
    };
    this.byType.get(event.type)?.forEach(run);
    this.all.forEach(run);
  }
}
