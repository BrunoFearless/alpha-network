import {
  Controller, Get, Post, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFiles, BadRequestException,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { WatchService } from './watch.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('watch')
export class WatchController {
  constructor(private readonly watchService: WatchService) {}

  // ── VIDEOS ────────────────────────────────────────────────

  @Post('videos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]))
  async uploadVideo(
    @CurrentUser() user: { id: string },
    @UploadedFiles() files: { video?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] },
    @Body() body: {
      title: string;
      description?: string;
      format?: string;
      category?: string;
      duration?: string;
      tags?: string;
    },
  ) {
    const videoFile = files?.video?.[0];
    if (!videoFile) throw new BadRequestException('Video file is required');
    if (!body.title) throw new BadRequestException('Title is required');

    const videoUrl = this.watchService.saveVideoUpload(user.id, videoFile);
    let thumbnailUrl: string | undefined;
    if (files?.thumbnail?.[0]) {
      thumbnailUrl = this.watchService.saveThumbnailUpload(user.id, files.thumbnail[0]);
    } else {
      // Auto-generate thumbnail from video
      thumbnailUrl = await this.watchService.extractThumbnail(user.id, videoUrl);
    }

    let tags: string[] = [];
    if (body.tags) {
      try { tags = JSON.parse(body.tags); } catch { tags = body.tags.split(',').map(t => t.trim()); }
    }

    const video = await this.watchService.createVideo(user.id, {
      title: body.title,
      description: body.description,
      videoUrl,
      thumbnailUrl,
      format: body.format,
      category: body.category,
      duration: body.duration ? parseFloat(body.duration) : undefined,
      tags,
    });
    return { success: true, data: video };
  }

  @Get('videos')
  async getVideos(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('format') format?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.watchService.getVideos({
      category,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      format,
      requesterId: userId,
    });
    return { success: true, data: result };
  }

  @Get('videos/user/:userId')
  async getUserVideos(@Param('userId') userId: string) {
    const videos = await this.watchService.getUserVideos(userId);
    return { success: true, data: videos };
  }

  @Get('videos/:id')
  async getVideo(@Param('id') id: string, @Query('userId') userId?: string) {
    const video = await this.watchService.getVideo(id, userId);
    return { success: true, data: video };
  }

  @Post('videos/:id/view')
  @HttpCode(HttpStatus.OK)
  async incrementView(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.watchService.incrementView(id, userId);
  }

  @Post('videos/:id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likeVideo(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const result = await this.watchService.likeVideo(id, user.id);
    return { success: true, data: result };
  }

  @Post('videos/:id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { content: string; parentId?: string; timestamp?: number },
  ) {
    if (!body.content?.trim()) throw new BadRequestException('Comment content is required');
    const comment = await this.watchService.addComment(id, user.id, body.content, body.parentId, body.timestamp);
    return { success: true, data: comment };
  }

  @Post('videos/:id/reactions')
  @UseGuards(JwtAuthGuard)
  async addReaction(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { emoji: string; timestamp: number },
  ) {
    if (!body.emoji || body.timestamp === undefined) throw new BadRequestException('Emoji and timestamp are required');
    const reaction = await this.watchService.addReaction(id, user.id, body.emoji, body.timestamp);
    return { success: true, data: reaction };
  }

  @Get('videos/:id/reactions')
  async getReactions(@Param('id') id: string) {
    const reactions = await this.watchService.getReactions(id);
    return { success: true, data: reactions };
  }

  @Delete('videos/:id')
  @UseGuards(JwtAuthGuard)
  async deleteVideo(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.watchService.deleteVideo(id, user.id);
    return { success: true };
  }

  @Post('videos/:id') // Patch behavior via POST for easier handling or use PATCH
  @UseGuards(JwtAuthGuard)
  async updateVideo(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { title?: string; description?: string; category?: string; tags?: string[] },
  ) {
    const video = await this.watchService.updateVideo(id, user.id, body);
    return { success: true, data: video };
  }
}
