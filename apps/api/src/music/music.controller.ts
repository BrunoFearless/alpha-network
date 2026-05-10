import {
  Controller, Get, Post, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFiles, BadRequestException,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MusicService } from './music.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  // ── TRACKS ────────────────────────────────────────────────

  /** Upload a track with optional cover art */
  @Post('tracks')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]))
  async uploadTrack(
    @CurrentUser() user: { id: string },
    @UploadedFiles() files: { audio?: Express.Multer.File[]; cover?: Express.Multer.File[] },
    @Body() body: { title: string; artist: string; album?: string; genre?: string; duration?: string; lyrics?: string; collaborators?: string },
  ) {
    const audioFile = files?.audio?.[0];
    if (!audioFile) throw new BadRequestException('Audio file is required');

    const audioUrl = this.musicService.saveAudioUpload(user.id, audioFile);
    let coverUrl: string | undefined;
    if (files?.cover?.[0]) {
      coverUrl = this.musicService.saveCoverUpload(user.id, files.cover[0]);
    }

    let parsedLyrics: any;
    try { if (body.lyrics) parsedLyrics = JSON.parse(body.lyrics); } catch(e) {}
    
    let parsedCollaborators: string[] = [];
    try { if (body.collaborators) parsedCollaborators = JSON.parse(body.collaborators); } catch(e) {}

    const track = await this.musicService.createTrack(user.id, {
      title: body.title,
      artist: body.artist,
      album: body.album,
      genre: body.genre,
      audioUrl,
      coverUrl,
      duration: body.duration ? parseInt(body.duration) : 0,
      lyrics: parsedLyrics,
      collaborators: parsedCollaborators,
    });

    return { success: true, data: track };
  }

  /** Get all public tracks (discovery feed) */
  @Get('tracks')
  async getTracks(
    @Query('search') search?: string,
    @Query('genre') genre?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.musicService.getTracks(undefined, search, genre, page ? +page : 1, limit ? +limit : 30);
    return { success: true, data: result };
  }

  /** Get tracks published by a specific user */
  @Get('tracks/user/:userId')
  async getUserTracks(@Param('userId') userId: string) {
    const tracks = await this.musicService.getUserTracks(userId);
    return { success: true, data: tracks };
  }

  /** Get radio tracks (continuous stream) */
  @Get('radio')
  async getRadio(@Query('genre') genre?: string) {
    const tracks = await this.musicService.getRadioTracks(genre);
    return { success: true, data: tracks };
  }

  /** Increment play count */
  @Post('tracks/:id/play')
  @HttpCode(HttpStatus.OK)
  async play(@Param('id') id: string) {
    await this.musicService.incrementPlays(id);
    return { success: true };
  }

  /** Delete own track */
  @Delete('tracks/:id')
  @UseGuards(JwtAuthGuard)
  async deleteTrack(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.musicService.deleteTrack(id, user.id);
  }

  // ── LIKES ────────────────────────────────────────────────

  @Post('tracks/:id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likeTrack(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const result = await this.musicService.likeTrack(id, user.id);
    return { success: true, data: result };
  }

  @Get('me/liked')
  @UseGuards(JwtAuthGuard)
  async getLikedTracks(@CurrentUser() user: { id: string }) {
    const tracks = await this.musicService.getLikedTracks(user.id);
    return { success: true, data: tracks };
  }

  // ── PLAYLISTS ────────────────────────────────────────────

  @Post('playlists')
  @UseGuards(JwtAuthGuard)
  async createPlaylist(
    @CurrentUser() user: { id: string },
    @Body() body: { title: string; description?: string; isPublic?: boolean },
  ) {
    const pl = await this.musicService.createPlaylist(user.id, body);
    return { success: true, data: pl };
  }

  @Get('playlists/user/:userId')
  async getUserPlaylists(@Param('userId') userId: string) {
    const pls = await this.musicService.getUserPlaylists(userId);
    return { success: true, data: pls };
  }

  @Get('playlists/:id')
  async getPlaylist(@Param('id') id: string) {
    const pl = await this.musicService.getPlaylist(id);
    return { success: true, data: pl };
  }

  @Post('playlists/:playlistId/tracks/:trackId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async addToPlaylist(
    @Param('playlistId') playlistId: string,
    @Param('trackId') trackId: string,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.musicService.addTrackToPlaylist(playlistId, trackId, user.id);
    return { success: true, data: result };
  }

  @Delete('playlists/:playlistId/tracks/:trackId')
  @UseGuards(JwtAuthGuard)
  async removeFromPlaylist(
    @Param('playlistId') playlistId: string,
    @Param('trackId') trackId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.musicService.removeTrackFromPlaylist(playlistId, trackId, user.id);
  }
}
