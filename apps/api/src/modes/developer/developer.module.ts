import { Module } from '@nestjs/common';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [DeveloperController],
  providers: [DeveloperService, PrismaService],
})
export class DeveloperModule {}
