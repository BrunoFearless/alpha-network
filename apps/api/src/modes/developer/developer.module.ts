import { Module } from '@nestjs/common';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { DeveloperGateway } from './developer.gateway';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule], // fornece JwtModule para o DeveloperGateway usar JwtService
  controllers: [DeveloperController],
  providers: [DeveloperService, DeveloperGateway],
})
export class DeveloperModule {}
