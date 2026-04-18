// ══════════════════════════════════════════════════════════
// CORREÇÃO DO LAZER CONTROLLER
// apps/api/src/modes/lazer/lazer.controller.ts
//
// O endpoint de eliminação de comentários estava incorreto.
// Era: @Post('posts/:id')  — conflitava com soft-delete de post
// Correto: @Delete('comments/:id')
//
// O ficheiro completo correto segue abaixo:
// ══════════════════════════════════════════════════════════

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { LazerService } from './lazer.service';
import { CreatePostLazerDto } from './dto/createPost-lazer.dto';
import { UpdatePostLazerDto } from './dto/updatePost-lazer.dto';
import { CreateCommentsLazerDto } from './dto/createComments-lazer.dto';
import { ToggleRequestDTO } from './dto/toggleRequest-lazer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SpotifyService } from './spotify.service';
import { DiscoverService } from './discover.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('lazer')
@UseGuards(JwtAuthGuard)
export class LazerController {
  constructor(
    private readonly lazerService: LazerService,
    private readonly spotifyService: SpotifyService,
    private readonly discoverService: DiscoverService,
  ) {}

  // ── Discovery ──────────────────────────────────────────────────────

  @Get('discover/trending')
  getTrending(@Query('category') category: string) {
    if (category === 'anime') return this.discoverService.getTrendingAnime();
    if (category === 'manga') return this.discoverService.getTrendingMangas();
    if (category === 'games') return this.discoverService.getTrendingGames();
    if (category === 'cinema') return this.discoverService.getCinemaContent();
    return { success: false, error: 'Invalid category' };
  }

  @Get('discover/wiki/:title')
  getWikiArticle(@Param('title') title: string) {
    return this.discoverService.getWikipediaArticle(title);
  }

  @Get('discover/search')
  searchUniversal(@Query('q') query: string) {
    return this.discoverService.searchUniversal(query);
  }

  @Get('discover/detail')
  getDetail(@Query('type') type: string, @Query('id') id: string, @Query('q') q?: string, @Query('page') page?: string) {
    return this.discoverService.getDetail(type, id, q, Number(page) || 1);
  }

  @Get('discover/reddit-trends')
  getRedditTrends(@Query('subreddit') subreddit?: string) {
    return this.discoverService.getRedditTrends(subreddit);
  }

  @Get('discover/gallery')
  getGallery(@Query('q') q: string, @Query('page') page?: string) {
    return this.discoverService.getAestheticGallery(q, page ? parseInt(page, 10) : 1);
  }

  // ── Tropes ─────────────────────────────────────────────────────────

  @Get('tropes')
  getAllTropes() {
    return this.lazerService.getAllTropes();
  }

  @Get('tropes/trending')
  getTrendingTropes() {
    return this.lazerService.getTrendingTropes();
  }

  @Post('tropes')
  @HttpCode(HttpStatus.CREATED)
  createTrope(
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('iconEmoji') iconEmoji?: string,
    @Body('category') category?: string,
  ) {
    return this.lazerService.createTrope(name, description, iconEmoji, category);
  }

  // ── Watching Now ───────────────────────────────────────────────────

  @Get('watching')
  getWatchingNow() {
    return this.lazerService.getWatchingNow();
  }

  @Post('watching/checkin')
  @HttpCode(HttpStatus.OK)
  createCheckIn(
    @Body('title') title: string,
    @Body('episode') episode: string,
    @Body('emoji') emoji: string,
    @Body('genre') genre: string,
    @Request() req: any
  ) {
    return this.lazerService.createCheckIn(req.user.id, title, episode, emoji, genre);
  }

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
    @Query('communityId') communityId?: string,
  ) {
    return this.lazerService.getFeed(cursor, limit ? parseInt(limit, 10) : 20, communityId);
  }

  @Get('posts/:id')
  findOnePost(@Param('id') id: string) {
    return this.lazerService.findOnePost(id);
  }

  @Post('posts/reactions')
  @HttpCode(HttpStatus.OK)
  toggleReaction(@Body() toggleRequest: ToggleRequestDTO, @Request() req: any) {
    return this.lazerService.toggleReaction(toggleRequest, req.user.id);
  }

  @Get('users/:userId/posts')
  @HttpCode(HttpStatus.OK)
  getUserPosts(@Param('userId') userId: string) {
    return this.lazerService.getUserPosts(userId);
  }

  @Patch('posts/:id')
  @HttpCode(HttpStatus.OK)
  updatePost(
    @Param('id') id: string,
    @Body() updatePostLazerDto: UpdatePostLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.updatePost(id, updatePostLazerDto, req.user.id);
  }

  @Patch('posts/:id/pin')
  @HttpCode(HttpStatus.OK)
  pinPost(@Param('id') id: string, @Request() req: any) {
    return this.lazerService.pinPost(id, req.user.id);
  }

  // CORRETO: DELETE /lazer/posts/:id
  @Delete('posts/:id')
  @HttpCode(HttpStatus.OK)
  removePost(@Param('id') id: string, @Request() req: any) {
    return this.lazerService.deletePost(id, req.user.id);
  }

  // ── Comentários ────────────────────────────────────────────────────

  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @Param('id') postId: string,
    @Body() dto: CreateCommentsLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.createComment(postId, dto, req.user.id);
  }

  @Get('posts/:id/comments')
  getComments(@Param('id') postId: string) {
    return this.lazerService.getComments(postId);
  }

  @Patch('comments/:id')
  updateComment(
    @Param('id') commentId: string,
    @Body() dto: CreateCommentsLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.updateComment(commentId, req.user.id, dto);
  }

  // CORRETO: DELETE /lazer/comments/:id
  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  deleteComment(@Param('id') commentId: string, @Request() req: any) {
    return this.lazerService.deleteComment(commentId, req.user.id);
  }

  // ── YouTube Proxy ─────────────────────────────────────────────────────

  @Get('youtube/search')
  searchYouTube(
    @Query('q') q: string,
    @Query('maxResults') maxResults?: string,
  ) {
    return this.lazerService.searchYouTube(q || 'anime trailer', maxResults ? parseInt(maxResults, 10) : 12);
  }

  @Get('youtube/channel/:channelId')
  getChannelVideos(
    @Param('channelId') channelId: string,
    @Query('maxResults') maxResults?: string,
  ) {
    return this.lazerService.getChannelVideos(channelId, maxResults ? parseInt(maxResults, 10) : 8);
  }

  // ── Spotify Integration ───────────────────────────────────────────────

  @Public()
  @Get('spotify/auth')
  getSpotifyAuthUrl(@Query('userId') userId: string, @Res() res: Response) {
    const url = this.spotifyService.getAuthUrl(userId);
    return res.redirect(url);
  }

  @Public()
  @Get('spotify/callback')
  async spotifyCallback(
    @Query('code') code: string, 
    @Query('state') userId: string,
    @Res() res: Response
  ) {
    await this.spotifyService.handleCallback(code, userId);
    // Redirect back to frontend
    return res.redirect('http://localhost:3000/main/lazer?spotify=success');
  }

  @Get('profile/:userId/playback')
  getSpotifyPlayback(@Param('userId') userId: string) {
    return this.spotifyService.getCurrentlyPlaying(userId);
  }
}