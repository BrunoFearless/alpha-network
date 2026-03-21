import { Controller, UseGuards } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('developer')
@UseGuards(JwtAuthGuard)
export class DeveloperController {
  constructor(private readonly service: DeveloperService) {}
}
