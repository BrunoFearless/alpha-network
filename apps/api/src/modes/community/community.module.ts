import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityGateway } from './community.gateway';

@Module({
  controllers: [CommunityController],
  providers: [CommunityService, CommunityGateway],
})
export class CommunityModule {}
