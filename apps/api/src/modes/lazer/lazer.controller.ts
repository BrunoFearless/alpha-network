import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { LazerService } from './lazer.service';
import { CreatePostLazerDto } from './dto/createPost-lazer.dto';
import { UpdatePostLazerDto } from './dto/updatePost-lazer.dto';
import { CreateCommentsLazerDto } from './dto/createComments-lazer.dto';
import { ToggleRequestDTO } from './dto/toggleRequest-lazer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('lazer')
@UseGuards(JwtAuthGuard)
export class LazerController {
  constructor(private readonly lazerService: LazerService) {}

  // ── Posts ──────────────────────────────────────────────────────────

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  createPost(@Body() dto: CreatePostLazerDto, @Request() req: any) {
    return this.lazerService.createPost(dto, req.user.id);
  }

  @Get('feed')
  getFeed(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lazerService.getFeed(cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('posts/:id')
  findOnePost(@Param('id') id: string) {
    return this.lazerService.findOnePost(id);
  }

  @Patch('posts/:id')
  updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.updatePost(id, dto, req.user.id);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.OK)
  removePost(@Param('id') id: string, @Request() req: any) {
    return this.lazerService.softDeletePost(id, req.user.id);
  }

  // ── Reações ────────────────────────────────────────────────────────

  @Post('posts/reactions')
  @HttpCode(HttpStatus.OK)
  toggleReaction(@Body() dto: ToggleRequestDTO, @Request() req: any) {
    return this.lazerService.toggleReaction(dto, req.user.id);
  }

  // ── Comentários ────────────────────────────────────────────────────

  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @Param('id') postId: string,
    @Body() dto: CreateCommentsLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.createComment(postId, req.user.id, dto);
  }

  @Get('posts/:id/comments')
  getComments(@Param('id') postId: string) {
    return this.lazerService.findComments(postId);
  }

  @Patch('comments/:id')
  updateComment(
    @Param('id') commentId: string,
    @Body() dto: CreateCommentsLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.updateComment(commentId, req.user.id, dto);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  deleteComment(@Param('id') commentId: string, @Request() req: any) {
    return this.lazerService.softDeleteComment(commentId, req.user.id);
  }
}