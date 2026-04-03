import { Injectable, Logger } from '@nestjs/common';

/**
 * FASE 6 — despacho assíncrono leve (substituível por BullMQ + Redis em produção).
 * Usa setImmediate para não bloquear o ciclo de pedidos HTTP/WebSocket.
 */
@Injectable()
export class WorkerDispatchService {
  private readonly log = new Logger(WorkerDispatchService.name);

  enqueue(task: () => void | Promise<void>): void {
    setImmediate(() => {
      Promise.resolve(task()).catch(e => this.log.warn(`task failed: ${(e as Error)?.message ?? e}`));
    });
  }
}
