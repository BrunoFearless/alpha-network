import {
  Controller, Get, Post, Put, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFiles, UploadedFile, BadRequestException,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { ArtService } from './art.service';
import { ContentModerationService } from './content-moderation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('art')
export class ArtController {
  constructor(
    private readonly artService: ArtService,
    private readonly moderation: ContentModerationService,
  ) {}

  @Get('ping')
  async ping() {
    return { success: true, message: 'pong' };
  }

  // ── ARTWORKS ───────────────────────────────────────────────

  @Post('arts')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadArt(
    @CurrentUser() user: { id: string },
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: {
      title: string;
      description?: string;
      category?: string;
      tags?: string;
      musicTrackId?: string;
    },
  ) {
    if (!files || files.length === 0) throw new BadRequestException('At least one image is required');
    if (!body.title) throw new BadRequestException('Title is required');

    // ── STEP 1: Text moderation (before any file I/O) ─────────────────────
    await this.moderation.enforce({
      title: body.title,
      description: body.description,
      tags: body.tags,
    });

    let tagsStr: string | undefined;
    if (body.tags) {
      try { 
        const parsed = JSON.parse(body.tags); 
        tagsStr = JSON.stringify(parsed);
      } catch { 
        tagsStr = JSON.stringify(body.tags.split(',').map(t => t.trim())); 
      }
    }

    // ── STEP 2: Save files to disk ────────────────────────────────────────
    const savedItems = files.map(f => this.artService.saveArtUpload(user.id, f));
    // savedItems: [{ url, filePath }, ...]
    const imageUrls = savedItems.map(s => s.url);
    const filePaths = savedItems.map(s => s.filePath);
    const imageUrl = imageUrls[0];

    // ── STEP 3: Image moderation ──────────────────────────────────────────
    const imageCheck = await this.moderation.check({
      title: body.title,
      imagePaths: filePaths,
    });

    if (!imageCheck.allowed) {
      // Delete the saved files before rejecting
      const basePath = path.normalize(path.join(process.cwd(), 'uploads', 'art'));
      for (const fp of filePaths) {
        try { 
          const fullPath = path.normalize(fp);
          if (fullPath.startsWith(basePath) && fs.existsSync(fullPath)) fs.unlinkSync(fullPath); 
        } catch {}
      }
      throw new BadRequestException(imageCheck.reason);
    }

    // ── STEP 4: Persist artwork ───────────────────────────────────────────
    const art = await this.artService.createArt(user.id, {
      title: body.title,
      description: body.description,
      imageUrl,
      imageUrls: imageUrls.length > 1 ? JSON.stringify(imageUrls) : undefined,
      category: body.category || 'Geral',
      tags: tagsStr,
      musicTrackId: body.musicTrackId,
    });

    return { success: true, data: art };
  }

  @Put('arts/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateArt(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; description?: string; category?: string; tags?: string; musicTrackId?: string },
  ) {
    let tagsStr: string | undefined;
    if (body.tags) {
      try { 
        const parsed = JSON.parse(body.tags); 
        tagsStr = JSON.stringify(parsed);
      } catch { 
        tagsStr = JSON.stringify(body.tags.split(',').map(t => t.trim())); 
      }
    }

    let imageUrl: string | undefined;
    if (file) {
      const saved = this.artService.saveArtUpload(user.id, file);
      imageUrl = saved.url;
    }

    const art = await this.artService.updateArt(id, user.id, {
      title: body.title,
      description: body.description,
      category: body.category,
      tags: tagsStr,
      imageUrl,
      musicTrackId: body.musicTrackId,
    });
    return { success: true, data: art };
  }

  @Delete('arts/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteArt(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.artService.deleteArt(id, user.id);
    return { success: true };
  }

  @Get('arts')
  async getArts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('authorId') authorId?: string,
  ) {
    const result = await this.artService.getArts({
      category,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      requesterId: userId,
      authorId,
    });
    return { success: true, data: result };
  }

  @Get('arts/:id')
  async getArt(@Param('id') id: string, @Query('userId') userId?: string) {
    const art = await this.artService.getArt(id, userId);
    return { success: true, data: art };
  }

  @Post('arts/:id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likeArt(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const result = await this.artService.likeArt(id, user.id);
    return { success: true, data: result };
  }

  @Get('arts/user/saved')
  @UseGuards(JwtAuthGuard)
  async getSavedArts(@CurrentUser() user: { id: string }) {
    const savedArts = await this.artService.getSavedArts(user.id);
    return { success: true, data: savedArts };
  }

  @Post('arts/:id/save')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleSaveArt(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const result = await this.artService.toggleSaveArt(id, user.id);
    return { success: true, data: result };
  }

  @Post('arts/:id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { content: string },
  ) {
    const comment = await this.artService.addComment(id, user.id, body.content);
    return { success: true, data: comment };
  }

  // ── COLLECTIONS ───────────────────────────────────────────

  @Post('collections')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cover'))
  async createCollection(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description?: string; isPublic?: string; collaborators?: string; parentId?: string; isGroup?: string },
  ) {
    if (!body.title) throw new BadRequestException('Title is required');
    let coverUrl: string | undefined;
    if (file) {
      coverUrl = this.artService.saveCollectionCoverUpload(user.id, file);
    }

    const collection = await this.artService.createCollection(user.id, {
      title: body.title,
      description: body.description,
      coverUrl,
      isPublic: body.isPublic === 'true',
      parentId: body.parentId,
      isGroup: body.isGroup === 'true',
    });

    if (body.collaborators) {
      try {
        const collabIds: string[] = JSON.parse(body.collaborators);
        for (const targetId of collabIds) {
          await this.artService.addCollaborator(collection.id, user.id, targetId);
        }
      } catch (e) {
        console.error('Failed to add initial collaborators', e);
      }
    }

    return { success: true, data: collection };
  }

  @Put('folder/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cover'))
  async updateCollection(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; description?: string; isPublic?: string; removeCover?: string; parentId?: string; isGroup?: string },
  ) {
    let coverUrl: string | undefined | null;
    if (file) {
      coverUrl = this.artService.saveCollectionCoverUpload(user.id, file);
    } else if (body.removeCover === 'true') {
      coverUrl = null;
    }

    const collection = await this.artService.updateCollection(id, user.id, {
      title: body.title,
      description: body.description,
      isPublic: body.isPublic !== undefined ? body.isPublic === 'true' : undefined,
      coverUrl,
      parentId: body.parentId,
      isGroup: body.isGroup !== undefined ? body.isGroup === 'true' : undefined,
    });
    return { success: true, data: collection };
  }

  @Put('folder/:id/viewmode')
  @UseGuards(JwtAuthGuard)
  async updateCollectionViewMode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { viewMode: string },
  ) {
    if (!body.viewMode) throw new BadRequestException('viewMode is required');
    const collection = await this.artService.updateCollectionViewMode(id, user.id, body.viewMode);
    return { success: true, data: collection };
  }

  @Put('folder/:id/layout')
  @UseGuards(JwtAuthGuard)
  async updateCollectionLayout(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { layout: { artId: string; positionX: number; positionY: number; width?: number; height?: number; zIndex?: number }[] },
  ) {
    if (!body.layout || !Array.isArray(body.layout)) throw new BadRequestException('layout array is required');
    await this.artService.updateCollectionLayout(id, user.id, body.layout);
    return { success: true };
  }

  @Get('collections/user/:userId')
  async getUserCollections(
    @Param('userId') userId: string,
    @Query('requesterId') requesterId?: string,
  ) {
    const collections = await this.artService.getCollections(userId, requesterId);
    return { success: true, data: collections };
  }

  @Get('folder/:id')
  async getCollection(@Param('id') id: string) {
    const collection = await this.artService.getCollection(id);
    return { success: true, data: collection };
  }

  @Post('collections/:id/add/:artId')
  @UseGuards(JwtAuthGuard)
  async addArtToCollection(
    @Param('id') id: string,
    @Param('artId') artId: string,
    @CurrentUser() user: { id: string },
  ) {
    const item = await this.artService.addArtToCollection(id, artId, user.id);
    return { success: true, data: item };
  }

  @Delete('collections/:id/remove/:artId')
  @UseGuards(JwtAuthGuard)
  async removeArtFromCollection(
    @Param('id') id: string,
    @Param('artId') artId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.artService.removeArtFromCollection(id, artId, user.id);
    return { success: true };
  }

  @Post('collections/:id/collaborators')
  @UseGuards(JwtAuthGuard)
  async addCollaborator(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { userId: string },
  ) {
    const collaborator = await this.artService.addCollaborator(id, user.id, body.userId);
    return { success: true, data: collaborator };
  }

  @Delete('collections/:id/collaborators/:userId')
  @UseGuards(JwtAuthGuard)
  async removeCollaborator(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.artService.removeCollaborator(id, user.id, targetUserId);
    return { success: true };
  }

  @Post('folder/:id/fork')
  @UseGuards(JwtAuthGuard)
  async forkCollection(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const fork = await this.artService.forkCollection(id, user.id);
    return { success: true, data: fork };
  }
}
