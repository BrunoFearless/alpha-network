import { Module } from '@nestjs/common';
import { ArtController } from './art.controller';
import { ArtService } from './art.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ArtController],
  providers: [ArtService, PrismaService],
  exports: [ArtService],
})
export class ArtModule {}
