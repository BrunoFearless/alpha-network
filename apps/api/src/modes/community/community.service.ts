import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// TODO (Bruno Fearless): implementar os métodos — ver guia v2-guia-bruno-fearless.docx
@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}
}
