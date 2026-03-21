import { Module } from '@nestjs/common';
import { LazerController } from './lazer.controller';
import { LazerService } from './lazer.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [LazerController],
  providers: [LazerService, PrismaService],
})
export class LazerModule {}
