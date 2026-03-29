import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// TODO (Alexandre Landa): implementar os métodos — ver guia v2-guia-alexandre-landa.docx
@Injectable()
export class DeveloperService {
  constructor(private readonly prisma: PrismaService) {}
}
