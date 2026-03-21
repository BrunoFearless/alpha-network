import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CreatorService {
  constructor(private readonly prisma: PrismaService) {}
}
