import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { CommunityModule } from '../community/community.module';
import { PlatformEventsModule } from '../../platform-events/platform-events.module';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { BotEngineService } from './bot-engine.service';
import { BotEngineBudgetService } from './bot-engine-budget.service';
import { BotExecutionLogService } from './bot-execution-log.service';
import { BotQueueService } from './bot-queue.service';
import { EventBusService } from '../../platform-events/event-bus.service';

@Module({
  imports: [forwardRef(() => CommunityModule), PlatformEventsModule],
  controllers: [BotsController],
  providers: [BotsService, BotEngineService, BotEngineBudgetService, BotExecutionLogService, BotQueueService],
  exports: [BotsService, BotEngineService, BotQueueService],
})
export class BotsModule implements OnModuleInit {
  constructor(
    private readonly engine: BotEngineService,
    private readonly queue: BotQueueService,
    private readonly eventBus: EventBusService,
  ) {}

  async onModuleInit() {
    // CORRIGIDO: await garante que a fila e o worker estão prontos
    // antes de começarmos a enfileirar eventos
    await this.queue.onModuleInit();

    // Só subscreve o bus depois da fila estar inicializada
    this.eventBus.subscribeAll((event) => {
      this.queue.enqueueEvent(event).catch((err) => {
        console.warn('[BotQueue] Falha ao enfileirar evento:', err);
      });
    });
  }
}