import { Controller, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// TODO (Bruno Fearless): implementar endpoints — ver guia v2-guia-bruno-fearless.docx
@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly service: CommunityService) {}
}
