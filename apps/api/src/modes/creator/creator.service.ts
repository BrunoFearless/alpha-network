import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// TODO (Pedro Evaristo): implementar os métodos — ver guia individual
@Injectable()
export class CreatorService {
  constructor(private readonly prisma: PrismaService) {}
}
