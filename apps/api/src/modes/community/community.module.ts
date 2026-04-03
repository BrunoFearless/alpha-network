import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityGateway } from './community.gateway';
import { BotsModule } from '../bots/bots.module';
import { PlatformEventsModule } from '../../platform-events/platform-events.module';

@Module({
  imports: [
    PlatformEventsModule,
    forwardRef(() => BotsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (c: ConfigService) => ({ secret: c.get('JWT_ACCESS_SECRET'), signOptions: { expiresIn: '15m' } }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CommunityController],
  providers:   [CommunityService, CommunityGateway],
  exports:     [CommunityService],
})
export class CommunityModule {}
