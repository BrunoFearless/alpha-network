import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FriendsService } from './friends.service';
import { IsUUID } from 'class-validator';
 
export class SendFriendRequestDto {
  @IsUUID() toUserId: string;
}
 
@Controller('users')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}
 
  @Get('me/friends')
  async getFriends(@CurrentUser() u: { id: string }) {
    return { success: true, data: await this.friends.getFriends(u.id) };
  }
 
  @Get('me/friend-requests')
  async getRequests(@CurrentUser() u: { id: string }) {
    return { success: true, data: await this.friends.getRequests(u.id) };
  }
 
  @Post('friend-requests')
  async send(@CurrentUser() u: { id: string }, @Body() dto: SendFriendRequestDto) {
    return { success: true, data: await this.friends.send(u.id, dto.toUserId) };
  }
 
  @Delete('friend-requests/:toUserId')
  async cancel(@CurrentUser() u: { id: string }, @Param('toUserId') toUserId: string) {
    return { success: true, data: await this.friends.cancel(u.id, toUserId) };
  }
 
  @Post('friend-requests/:requestId/accept')
  @HttpCode(HttpStatus.OK)
  async accept(@CurrentUser() u: { id: string }, @Param('requestId') requestId: string) {
    return { success: true, data: await this.friends.accept(u.id, requestId) };
  }
 
  @Post('friend-requests/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  async reject(@CurrentUser() u: { id: string }, @Param('requestId') requestId: string) {
    return { success: true, data: await this.friends.reject(u.id, requestId) };
  }
 
  @Delete('friends/:friendId')
  async remove(@CurrentUser() u: { id: string }, @Param('friendId') friendId: string) {
    return { success: true, data: await this.friends.remove(u.id, friendId) };
  }
 
  @Get('me/suggestions')
  async getSuggestions(@CurrentUser() u: { id: string }) {
    return { success: true, data: await this.friends.getSuggestions(u.id) };
  }
}