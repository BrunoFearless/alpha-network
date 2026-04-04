/**
 * Standalone worker script para processar bot events via BullMQ
 * 
 * Uso:
 *   node dist/modes/bots/bot-worker.js
 * 
 * Escalabilidade:
 *   - Rodar múltiplas instâncias deste worker
 *   - Redis coordena distributivamente
 *   - Suporta horizontal scaling sem perder jobs
 * 
 * Exemplo docker-compose.yml:
 *
 *   bot-worker-1:
 *     image: node:20-alpine
 *     command: node dist/modes/bots/bot-worker.js
 *     environment:
 *       - REDIS_HOST=redis
 *       - REDIS_PORT=6379
 *       - BOT_QUEUE_CONCURRENCY=10
 *
 *   bot-worker-2:
 *     image: node:20-alpine
 *     command: node dist/modes/bots/bot-worker.js
 *   (etc...)
 */

import { Logger } from '@nestjs/common';
import { Worker, QueueEvents } from 'bullmq';
import type { PlatformEvent } from '../../platform-events/platform-events.types';
import type { BotProcessEventJob } from './bot-queue.types';

const logger = new Logger('BotWorker');

// Redis config
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

// Simular BotEngineService para standalone
// Em produção, importar via DI
async function processBotEvent(event: PlatformEvent): Promise<void> {
  // Placeholder: em produção, injetar BotEngineService
  const eventInfo = `event type: ${event.type}, server: ${'serverId' in event ? event.serverId : 'unknown'}`;
  logger.log(`[PLACEHOLDER] Would process ${eventInfo}`);
  
  // Simular processamento
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function startWorker() {
  try {
    logger.log('Starting BotWorker...');

    const worker = new Worker<BotProcessEventJob>(
      'bot-events',
      async (job) => {
        const { eventId, event, createdAt } = job.data;
        const latency = Date.now() - createdAt;

        try {
          logger.log(`Processing ${eventId} (latency: ${latency}ms, attempt ${job.attemptsMade + 1})`);
          await processBotEvent(event);
          return `Completed: ${eventId}`;
        } catch (err) {
          logger.error(`Failed to process ${eventId}:`, err);
          throw err;
        }
      },
      {
        connection: redisConfig,
        concurrency: parseInt(process.env.BOT_QUEUE_CONCURRENCY || '10'),
      },
    );

    // Event listeners
    const queueEvents = new QueueEvents('bot-events', { connection: redisConfig });

    worker.on('completed', (job) => {
      logger.debug(`✓ Job completed: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      logger.warn(`✗ Job failed: ${job?.id || 'unknown'} - ${err?.message}`);
    });

    worker.on('error', (err) => {
      logger.error('Worker error:', err);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.warn(`Queue: Job ${jobId} failed: ${failedReason}`);
    });

    logger.log('✓ BotWorker started and listening for jobs');
    logger.log(`Concurrency: ${process.env.BOT_QUEUE_CONCURRENCY || 10}`);
    logger.log(`Redis: ${redisConfig.host}:${redisConfig.port}`);
  } catch (err) {
    logger.error('Failed to start worker:', err);
    process.exit(1);
  }
}

// Start worker
startWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.log('Shutting down worker...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.log('Shutting down worker...');
  process.exit(0);
});
