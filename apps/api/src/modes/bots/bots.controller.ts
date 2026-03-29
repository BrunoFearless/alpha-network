import { Controller, UseGuards } from '@nestjs/common';
import { BotsService } from './bots.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// TODO (Bruno Fearless): implementar endpoints — ver guia v2-guia-bruno-fearless.docx
@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private readonly botsService: BotsService) {}
}
