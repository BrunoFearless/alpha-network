// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/alpha-core/alpha-core.module.ts
// ════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { AlphaCoreController } from './alpha-core.controller';
import { AlphaCoreService } from './alpha-core.service';

@Module({
  controllers: [AlphaCoreController],
  providers: [AlphaCoreService],
  exports: [AlphaCoreService],
})
export class AlphaCoreModule {}
