import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class LazerService {
  constructor(private readonly prisma: PrismaService) {}
}
