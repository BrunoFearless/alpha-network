import { Module, forwardRef } from '@nestjs/common';
import { CommunityModule } from '../community/community.module';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { BotEngineService } from './bot-engine.service';
import { BotEngineBudgetService } from './bot-engine-budget.service';
import { BotExecutionLogService } from './bot-execution-log.service';

@Module({
  imports: [forwardRef(() => CommunityModule)],
  controllers: [BotsController],
  providers:   [BotsService, BotEngineService, BotEngineBudgetService, BotExecutionLogService],
  exports:     [BotsService, BotEngineService],
})
export class BotsModule {}
