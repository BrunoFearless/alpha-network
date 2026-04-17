import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LazerCommunityService } from './lazer-community.service';
import { CreateLazerCommunityDto, UpdateLazerCommunityDto, CreateLazerCommunityRuleDto } from './lazer-community.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('lazer/communities')
@UseGuards(JwtAuthGuard)
export class LazerCommunityController {
  constructor(private readonly service: LazerCommunityService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateLazerCommunityDto) {
    return this.service.create(userId, dto);
  }

  @Get('my')
  getMy(@CurrentUser('id') userId: string) {
    return this.service.getMyCommunities(userId);
  }

  @Get('explore')
  getAll() {
    return this.service.getAllPublic();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateLazerCommunityDto) {
    return this.service.update(id, userId, dto);
  }

  @Post('join')
  join(@CurrentUser('id') userId: string, @Body('inviteCode') inviteCode: string) {
    return this.service.joinByInvite(inviteCode, userId);
  }

  @Delete(':id/leave')
  leave(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.leave(id, userId);
  }

  @Post(':id/rules')
  addRule(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: CreateLazerCommunityRuleDto) {
    return this.service.addRule(id, userId, dto);
  }

  @Delete('rules/:ruleId')
  removeRule(@Param('ruleId') ruleId: string, @CurrentUser('id') userId: string) {
    return this.service.removeRule(ruleId, userId);
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('id') id: string, @CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.saveCommunityMedia(id, userId, file);
  }
}
