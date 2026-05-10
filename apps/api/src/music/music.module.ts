import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MusicController],
  providers: [MusicService, PrismaService],
  exports: [MusicService],
})
export class MusicModule {}
