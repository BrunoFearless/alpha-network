import { Module } from '@nestjs/common';
import { LazerService } from './lazer.service';
import { LazerController } from './lazer.controller';

@Module({
  controllers: [LazerController],
  providers: [LazerService],
})
export class LazerModule {}
