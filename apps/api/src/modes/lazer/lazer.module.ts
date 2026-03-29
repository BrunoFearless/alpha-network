import { Module } from '@nestjs/common';
import { LazerController } from './lazer.controller';
import { LazerService } from './lazer.service';

@Module({
  controllers: [LazerController],
  providers: [LazerService],
})
export class LazerModule {}
