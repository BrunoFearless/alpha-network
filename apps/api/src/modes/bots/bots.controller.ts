// ─────────────────────────────────────────────────────────────────
//  BotsController — Bruno Fearless
//  TODO: implementar os endpoints — ver Guia Individual
// ─────────────────────────────────────────────────────────────────
import { Controller, UseGuards } from '@nestjs/common';
import { BotsService } from './bots.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Todos os endpoints deste controller precisam de autenticação
// @UseGuards(JwtAuthGuard)  ← descomenta quando começares
@Controller('bots')
export class BotsController {
  constructor(private botsService: BotsService) {}

  // TODO (Bruno Fearless): implementar endpoints — ver Guia Individual
}
