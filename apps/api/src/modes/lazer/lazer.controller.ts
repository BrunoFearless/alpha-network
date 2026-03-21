import { Controller, UseGuards } from '@nestjs/common';
import { LazerService } from './lazer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('lazer')
@UseGuards(JwtAuthGuard)
export class LazerController {
  constructor(private readonly service: LazerService) {}
}
