import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class WatchService {
  constructor(private readonly prisma: PrismaService) {}

  // ── UPLOADS ────────────────────────────────────────────────

  saveVideoUpload(userId: string, file: Express.Multer.File): string {
    const dir = path.join(process.cwd(), 'uploads', 'videos', userId);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `video_${Date.now()}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    return `/uploads/videos/${userId}/${filename}`;
  }

  saveThumbnailUpload(userId: string, file: Express.Multer.File): string {
    const dir = path.join(process.cwd(), 'uploads', 'thumbnails', userId);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `thumb_${Date.now()}${path.extname(file.originalname)}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    return `/uploads/thumbnails/${userId}/${filename}`;
  }

  async extractThumbnail(userId: string, videoRelativeUrl: string): Promise<string> {
    // Remove leading slash if present to avoid path.join issues
    const cleanRelativePath = videoRelativeUrl.startsWith('/') ? videoRelativeUrl.substring(1) : videoRelativeUrl;
    const videoPath = path.join(process.cwd(), cleanRelativePath);
    
    const thumbDir = path.join(process.cwd(), 'uploads', 'thumbnails', userId);
    fs.mkdirSync(thumbDir, { recursive: true });

    const thumbFilename = `thumb_gen_${Date.now()}.jpg`;
    
    console.log(`[WatchService] A gerar miniatura para: ${videoPath}`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: thumbFilename,
          folder: thumbDir,
          size: '640x360',
        })
        .on('start', (cmd) => {
          console.log(`[WatchService] Comando ffmpeg iniciado: ${cmd}`);
        })
        .on('end', () => {
          const resultUrl = `/uploads/thumbnails/${userId}/${thumbFilename}`;
          console.log(`[WatchService] Miniatura gerada com sucesso: ${resultUrl}`);
          resolve(resultUrl);
        })
        .on('error', (err) => {
          console.error('[WatchService] Erro FFmpeg:', err.message);
          resolve(''); 
        });
    });
  }

  // ── VIDEOS ────────────────────────────────────────────────

  async createVideo(authorId: string, dto: {
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    format?: string;
    category?: string;
    duration?: number;
    tags?: string[];
  }) {
    return this.prisma.alphaVideo.create({
      data: {
        authorId,
        title: dto.title,
        description: dto.description,
        videoUrl: dto.videoUrl,
        thumbnailUrl: dto.thumbnailUrl,
        format: dto.format || 'horizontal',
        category: dto.category || 'Geral',
        duration: dto.duration || 0,
        tags: dto.tags ? JSON.stringify(dto.tags) : null,
      },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async getVideos(opts: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    format?: string;
    requesterId?: string;
  } = {}) {
    const { category, search, page = 1, limit = 20, format, requesterId } = opts;
    const where: any = { deletedAt: null };
    if (category && category !== 'Para Ti') where.category = category;
    if (format) where.format = format;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [videos, total] = await Promise.all([
      this.prisma.alphaVideo.findMany({
        where,
        orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
          _count: { select: { likes: true, comments: true } },
          ...(requesterId ? { likes: { where: { userId: requesterId }, select: { userId: true } } } : {}),
        },
      }),
      this.prisma.alphaVideo.count({ where }),
    ]);

    return {
      videos: videos.map(v => ({
        ...v,
        liked: requesterId ? (v as any).likes?.length > 0 : false,
        likesCount: v._count.likes,
        commentsCount: v._count.comments,
        tags: v.tags ? JSON.parse(v.tags as string) : [],
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getVideo(id: string, requesterId?: string) {
    const video = await this.prisma.alphaVideo.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        _count: { select: { likes: true, comments: true } },
        ...(requesterId ? { likes: { where: { userId: requesterId }, select: { userId: true } } } : {}),
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
            _count: { select: { likes: true, replies: true } },
          },
        },
      },
    });

    if (!video) throw new NotFoundException('Video not found');

    return {
      ...video,
      liked: requesterId ? (video as any).likes?.length > 0 : false,
      likesCount: video._count.likes,
      commentsCount: video._count.comments,
      tags: video.tags ? JSON.parse(video.tags as string) : [],
    };
  }

  async incrementView(videoId: string, userId?: string) {
    await this.prisma.alphaVideo.update({
      where: { id: videoId },
      data: { views: { increment: 1 } },
    });
    if (userId) {
      await this.prisma.alphaVideoView.create({
        data: { videoId, userId },
      }).catch(() => {}); // ignore duplicate
    }
    return { success: true };
  }

  async likeVideo(videoId: string, userId: string) {
    const existing = await this.prisma.alphaVideoLike.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });
    if (existing) {
      await this.prisma.alphaVideoLike.delete({
        where: { videoId_userId: { videoId, userId } },
      });
      return { liked: false };
    }
    await this.prisma.alphaVideoLike.create({ data: { videoId, userId } });
    return { liked: true };
  }

  async addComment(videoId: string, userId: string, content: string, parentId?: string) {
    const comment = await this.prisma.alphaVideoComment.create({
      data: { videoId, authorId: userId, content, parentId },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        _count: { select: { likes: true, replies: true } },
      },
    });
    return comment;
  }

  async deleteVideo(id: string, userId: string) {
    const video = await this.prisma.alphaVideo.findUnique({ where: { id } });
    if (!video) throw new NotFoundException();
    if (video.authorId !== userId) throw new ForbiddenException();
    await this.prisma.alphaVideo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async updateVideo(id: string, userId: string, dto: {
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
  }) {
    const video = await this.prisma.alphaVideo.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    if (video.authorId !== userId) throw new ForbiddenException('Not your video');

    return this.prisma.alphaVideo.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
      },
    });
  }

  async getUserVideos(profileUserId: string) {
    const videos = await this.prisma.alphaVideo.findMany({
      where: { authorId: profileUserId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return videos.map(v => ({
      ...v,
      likesCount: v._count.likes,
      commentsCount: v._count.comments,
      tags: v.tags ? JSON.parse(v.tags as string) : [],
    }));
  }
}
