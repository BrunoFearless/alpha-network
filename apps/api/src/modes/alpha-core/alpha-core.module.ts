// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/modes/alpha-core/alpha-core.module.ts
// ════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AlphaCoreController } from './alpha-core.controller';
import { AlphaCoreService } from './alpha-core.service';
import { AlphaAIController } from './alpha-ai.controller';
import { AlphaAIService } from './alpha-ai.service';
import { HumanizerService } from './humanizer.service';
import { UsersModule } from '../../users/users.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [AlphaCoreController, AlphaAIController],
  providers: [AlphaCoreService, AlphaAIService, HumanizerService],
  exports: [AlphaCoreService, AlphaAIService, HumanizerService],
})
export class AlphaCoreModule {}
