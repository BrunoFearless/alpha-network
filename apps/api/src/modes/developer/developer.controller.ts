import { Controller, UseGuards } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// TODO (Alexandre Landa): implementar endpoints — ver guia v2-guia-alexandre-landa.docx
@Controller('developer')
@UseGuards(JwtAuthGuard)
export class DeveloperController {
  constructor(private readonly service: DeveloperService) {}
}
