import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { randomUUID } from 'crypto';
import { BotEngineService } from './bot-engine.service';
import type { PlatformEvent } from '../../platform-events/platform-events.types';
import type { BotProcessEventJob, BotQueueStats } from './bot-queue.types';

/**
 * BullMQ Queue Service para processamento de eventos em background.
 * Escalável horizontalmente com múltiplos workers.
 *
 * CORRIGIDO: a classe agora implementa OnModuleInit (além de OnModuleDestroy),
 * garantindo que o NestJS pode chamar onModuleInit() diretamente se necessário,
 * e que o BotsModule pode fazer await this.queue.onModuleInit() com segurança.
 */
@Injectable()
export class BotQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotQueueService.name);
  private queue: Queue<BotProcessEventJob>;
  private worker: Worker<BotProcessEventJob>;
  private queueEvents: QueueEvents;
  private initialized = false;

  private readonly redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  };

  constructor(private readonly engine: BotEngineService) {}

  async onModuleInit() {
    // Evita dupla inicialização caso NestJS e o BotsModule chamem simultaneamente
    if (this.initialized) return;
    this.initialized = true;

    try {
      this.logger.log('A inicializar BotQueueService...');

      this.queue = new Queue<BotProcessEventJob>('bot-events', {
        connection: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: { age: 3600 },
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          attempts: 3,
        },
      });

      this.worker = new Worker<BotProcessEventJob>(
        'bot-events',
        async (job) => {
          return this.processJob(job.data);
        },
        {
          connection: this.redisConfig,
          concurrency: parseInt(process.env.BOT_QUEUE_CONCURRENCY || '10'),
        },
      );

      this.queueEvents = new QueueEvents('bot-events', {
        connection: this.redisConfig,
      });

      this.setupEventListeners();

      this.logger.log('✓ BotQueueService inicializado');
    } catch (err) {
      this.initialized = false;
      this.logger.error('Falha ao inicializar BotQueueService:', err);
      throw err;
    }
  }

  async enqueueEvent(event: PlatformEvent): Promise<void> {
    if (!this.initialized || !this.queue) {
      this.logger.warn('[BotQueue] Fila ainda não está pronta, descartando evento.');
      return;
    }
    try {
      const eventId = randomUUID();
      await this.queue.add(
        `event-${eventId}`,
        {
          eventId,
          event,
          createdAt: Date.now(),
        },
        {
          jobId: eventId,
          removeOnComplete: { age: 3600 },
        },
      );
      this.logger.debug(`Evento enfileirado: ${eventId}`);
    } catch (err) {
      this.logger.error('Falha ao enfileirar evento:', err);
      throw err;
    }
  }

  private async processJob(data: BotProcessEventJob): Promise<void> {
    const { eventId, event, createdAt } = data;
    const latency = Date.now() - createdAt;
    try {
      this.logger.debug(`A processar evento ${eventId} (latência: ${latency}ms)`);
      await this.engine.processEvent(event);
    } catch (err) {
      this.logger.error(`Falha ao processar evento ${eventId}:`, err);
      throw err;
    }
  }

  private setupEventListeners() {
    this.queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug(`Job concluído: ${jobId}`);
    });
    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.warn(`Job falhado: ${jobId} - ${failedReason}`);
    });
    this.queueEvents.on('error', (err) => {
      this.logger.error('Erro na fila:', err);
    });
  }

  async getStats(): Promise<BotQueueStats> {
    if (!this.queue) return { queued: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 };
    const [queued, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getJobCounts('wait'),
      this.queue.getJobCounts('active'),
      this.queue.getJobCounts('completed'),
      this.queue.getJobCounts('failed'),
      this.queue.getJobCounts('delayed'),
      this.queue.getJobCounts('paused'),
    ]);
    return {
      queued:    (queued    as any).wait      || 0,
      active:    (active    as any).active    || 0,
      completed: (completed as any).completed || 0,
      failed:    (failed    as any).failed    || 0,
      delayed:   (delayed   as any).delayed   || 0,
      paused:    (paused    as any).paused    || 0,
    };
  }

  async cleanOldJobs(olderThan = 86400000): Promise<void> {
    if (!this.queue) return;
    await this.queue.clean(olderThan, 100, 'completed');
    this.logger.log(`Jobs antigos limpos (olderThan: ${olderThan}ms)`);
  }

  async pause(): Promise<void> {
    if (!this.queue) return;
    await this.queue.pause();
    this.logger.log('Fila pausada');
  }

  async resume(): Promise<void> {
    if (!this.queue) return;
    await this.queue.resume();
    this.logger.log('Fila retomada');
  }

  async onModuleDestroy() {
    this.logger.log('A encerrar BotQueueService...');
    await this.worker?.close();
    await this.queueEvents?.close();
    await this.queue?.close();
    this.initialized = false;
    this.logger.log('✓ BotQueueService encerrado');
  }
}