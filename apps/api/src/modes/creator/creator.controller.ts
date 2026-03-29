import { Controller, UseGuards } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// TODO (Pedro Evaristo): implementar endpoints — ver guia individual
@Controller('creator')
@UseGuards(JwtAuthGuard)
export class CreatorController {
  constructor(private readonly service: CreatorService) {}
}
