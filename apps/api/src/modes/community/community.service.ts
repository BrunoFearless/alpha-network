import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}
}
