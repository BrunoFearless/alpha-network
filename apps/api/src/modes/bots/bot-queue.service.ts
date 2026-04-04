import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { randomUUID } from 'crypto';
import { BotEngineService } from './bot-engine.service';
import type { PlatformEvent } from '../../platform-events/platform-events.types';
import type { BotProcessEventJob, BotQueueOptions, BotQueueStats } from './bot-queue.types';

/**
 * BullMQ Queue Service para processamento de eventos em background
 * Escalável horizontalmente com múltiplos workers
 */
@Injectable()
export class BotQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(BotQueueService.name);
  private queue: Queue<BotProcessEventJob>;
  private worker: Worker<BotProcessEventJob>;
  private queueEvents: QueueEvents;

  // Redis connection config (padrão: localhost:6379)
  private readonly redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null, // Important for BullMQ
  };

  constructor(private readonly engine: BotEngineService) {}

  /**
   * Inicializar a fila e o worker
   */
  async onModuleInit() {
    try {
      this.logger.log('Initializing BotQueueService...');

      // Criar fila
      this.queue = new Queue<BotProcessEventJob>('bot-events', {
        connection: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: { age: 3600 }, // Manter por 1 hora
          backoff: {
            type: 'exponential',
            delay: 2000, // 2s inicial
          },
          attempts: 3,
        },
      });

      // Criar worker (pode rodar em processo separado)
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

      // Queue events para logging
      this.queueEvents = new QueueEvents('bot-events', {
        connection: this.redisConfig,
      });

      // Listeners
      this.setupEventListeners();

      this.logger.log('✓ BotQueueService initialized');
    } catch (err) {
      this.logger.error('Failed to initialize BotQueueService:', err);
      throw err;
    }
  }

  /**
   * Adicionar evento à fila para processamento async
   */
  async enqueueEvent(event: PlatformEvent): Promise<void> {
    try {
      const eventId = randomUUID();
      const job = await this.queue.add(
        `event-${eventId}`,
        {
          eventId,
          event,
          createdAt: Date.now(),
        },
        {
          // Job ID para deduplicação
          jobId: eventId,
          removeOnComplete: { age: 3600 },
        },
      );

      this.logger.debug(`Event enqueued: ${eventId} (job ${job.id})`);
    } catch (err) {
      this.logger.error(`Failed to enqueue event:`, err);
      throw err;
    }
  }

  /**
   * Processar um evento (executado pelo worker)
   */
  private async processJob(data: BotProcessEventJob): Promise<void> {
    const { eventId, event, createdAt } = data;
    const latency = Date.now() - createdAt;

    try {
      this.logger.debug(`Processing event ${eventId} (latency: ${latency}ms)`);
      await this.engine.processEvent(event);
      this.logger.debug(`Event ${eventId} processed successfully`);
    } catch (err) {
      this.logger.error(`Failed to process event ${eventId}:`, err);
      throw err; // BullMQ vai fazer retry automaticamente
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    this.queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug(`Job completed: ${jobId}`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.warn(`Job failed: ${jobId} - ${failedReason}`);
    });

    this.queueEvents.on('error', (err) => {
      this.logger.error('Queue error:', err);
    });
  }

  /**
   * Obter estatísticas da fila
   */
  async getStats(): Promise<BotQueueStats> {
    const [queued, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getJobCounts('wait'),
      this.queue.getJobCounts('active'),
      this.queue.getJobCounts('completed'),
      this.queue.getJobCounts('failed'),
      this.queue.getJobCounts('delayed'),
      this.queue.getJobCounts('paused'),
    ]);

    return {
      queued: (queued as any).wait || 0,
      active: (active as any).active || 0,
      completed: (completed as any).completed || 0,
      failed: (failed as any).failed || 0,
      delayed: (delayed as any).delayed || 0,
      paused: (paused as any).paused || 0,
    };
  }

  /**
   * Limpar jobs completados/falhados
   */
  async cleanOldJobs(olderThan: number = 86400000): Promise<void> {
    await this.queue.clean(olderThan, 100, 'completed');
    this.logger.log(`Cleaned old jobs (olderThan: ${olderThan}ms)`);
  }

  /**
   * Pausar processamento
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.log('Queue paused');
  }

  /**
   * Retomar processamento
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.log('Queue resumed');
  }

  /**
   * Cleanup ao destruir módulo
   */
  async onModuleDestroy() {
    this.logger.log('Cleaning up BotQueueService...');
    await this.worker?.close();
    await this.queueEvents?.close();
    await this.queue?.close();
    this.logger.log('✓ BotQueueService cleaned up');
  }
}
