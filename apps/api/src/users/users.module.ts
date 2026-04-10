import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MediaService } from '../common/services/media.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, MediaService],
  exports: [UsersService],
})
export class UsersModule {}
