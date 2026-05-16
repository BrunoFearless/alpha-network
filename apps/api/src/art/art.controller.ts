import {
  Controller, Get, Post, Put, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArtService } from './art.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('art')
export class ArtController {
  constructor(private readonly artService: ArtService) {}

  @Get('ping')
  async ping() {
    return { success: true, message: 'pong' };
  }

  // ── ARTWORKS ───────────────────────────────────────────────

  @Post('arts')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadArt(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      title: string;
      description?: string;
      category?: string;
      tags?: string;
    },
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    if (!body.title) throw new BadRequestException('Title is required');

    const imageUrl = this.artService.saveArtUpload(user.id, file);

    let tagsStr: string | undefined;
    if (body.tags) {
      try { 
        const parsed = JSON.parse(body.tags); 
        tagsStr = JSON.stringify(parsed);
      } catch { 
        tagsStr = JSON.stringify(body.tags.split(',').map(t => t.trim())); 
      }
    }

    const art = await this.artService.createArt(user.id, {
      title: body.title,
      description: body.description,
      imageUrl,
      category: body.category || 'Geral',
      tags: tagsStr
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
    @Body() body: { title?: string; description?: string; category?: string; tags?: string },
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
      imageUrl = this.artService.saveArtUpload(user.id, file);
    }

    const art = await this.artService.updateArt(id, user.id, {
      title: body.title,
      description: body.description,
      category: body.category,
      tags: tagsStr,
      imageUrl
    });
    return { success: true, data: art };
  }

  @Get('arts')
  async getArts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.artService.getArts({
      category,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      requesterId: userId,
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

  @Delete('arts/:id')
  @UseGuards(JwtAuthGuard)
  async deleteArt(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.artService.deleteArt(id, user.id);
    return { success: true };
  }

  // ── COLLECTIONS ───────────────────────────────────────────

  @Post('collections')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cover'))
  async createCollection(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description?: string; isPublic?: string; collaborators?: string },
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
    @Body() body: { title?: string; description?: string; isPublic?: string; removeCover?: string },
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
      coverUrl
    });
    return { success: true, data: collection };
  }

  @Get('collections/user/:userId')
  async getUserCollections(@Param('userId') userId: string) {
    const collections = await this.artService.getCollections(userId);
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
}
