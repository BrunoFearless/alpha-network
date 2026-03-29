import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// TODO (Obed): implementar os métodos — ver guia v2-guia-obed-jorge.docx
@Injectable()
export class LazerService {
  constructor(private readonly prisma: PrismaService) {}
}
