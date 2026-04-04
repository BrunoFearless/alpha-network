import type { PlatformEvent } from '../../platform-events/platform-events.types';

/**
 * Job data payload para BullMQ
 * Um job por evento de bot
 */
export interface BotProcessEventJob {
  eventId: string;
  event: PlatformEvent;
  createdAt: number; // timestamp em ms para rastrear latência
}

/**
 * Configuração de retry
 */
export interface BotQueueRetryConfig {
  maxAttempts: number; // max 3 tentativas
  backoffType: 'exponential' | 'fixed';
  backoffDelay: number; // delay em ms
}

/**
 * Opções de processamento da fila
 */
export interface BotQueueOptions {
  concurrency: number; // workers parelelos
  removeOnComplete?: boolean | { age: number }; // cleanup completed jobs
  removeOnFail?: boolean | { age: number }; // cleanup failed jobs
  defaultJobOptions?: {
    removeOnComplete?: boolean | { age: number };
    backoff?: BotQueueRetryConfig;
  };
}

/**
 * Estatísticas da fila
 */
export interface BotQueueStats {
  queued: number; // esperando processamento
  active: number; // em processamento
  completed: number; // completados
  failed: number; // falhados
  delayed: number; // agendados
  paused: number; // pausados
}
