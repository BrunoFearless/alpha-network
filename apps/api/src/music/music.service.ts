import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MusicService {
  constructor(private readonly prisma: PrismaService) {}

  // ── TRACKS ────────────────────────────────────────────────

  async createTrack(authorId: string, dto: {
    title: string;
    artist: string;
    album?: string;
    genre?: string;
    audioUrl: string;
    coverUrl?: string;
    duration?: number;
    lyrics?: any;
    collaborators?: string[]; // array of userIds
  }) {
    return this.prisma.$transaction(async (tx) => {
      const track = await tx.lazerTrack.create({
      data: {
        authorId,
        title: dto.title,
        artist: dto.artist,
        album: dto.album,
        genre: dto.genre,
        audioUrl: dto.audioUrl,
        coverUrl: dto.coverUrl,
        duration: dto.duration || 0,
        lyrics: dto.lyrics || null,
      },
    });

    if (dto.collaborators && dto.collaborators.length > 0) {
      await tx.lazerTrackCollaboration.createMany({
        data: dto.collaborators.map(userId => ({
          trackId: track.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    const result = await tx.lazerTrack.findUnique({
      where: { id: track.id },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        likes: { select: { userId: true } },
        collaborations: {
          include: { user: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } } }
        },
        _count: { select: { likes: true } },
      },
    });

    if (result) {
      // Notify friends
      const friends = await tx.friendship.findMany({
        where: {
          OR: [
            { userId: authorId, status: 'accepted' },
            { friendId: authorId, status: 'accepted' },
          ],
        },
      });

      const friendIds = friends.map(f => f.userId === authorId ? f.friendId : f.userId);

      if (friendIds.length > 0) {
        await (tx as any).lazerNotification.createMany({
          data: friendIds.map(fid => ({
            userId: fid,
            title: 'Nova Música Publicada 🎵',
            content: `${result.author.profile?.displayName || result.author.profile?.username} acabou de publicar "${result.title}"!`,
            type: 'music_published',
            link: `/main/lazer?tab=music&trackId=${result.id}`,
          })),
        });
      }
    }

    return result;
  });
}

  async getTracks(userId?: string, search?: string, genre?: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null, isPublic: true };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
        { album: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (genre) where.genre = genre;

    const [tracks, total] = await Promise.all([
      this.prisma.lazerTrack.findMany({
        where,
        skip,
        take: limit,
        orderBy: { plays: 'desc' },
        include: {
          author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
          likes: { select: { userId: true } },
          collaborations: {
            include: { user: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } } }
          },
          _count: { select: { likes: true } },
        },
      }),
      this.prisma.lazerTrack.count({ where }),
    ]);

    return {
      tracks: tracks.map(t => ({
        ...t,
        liked: userId ? t.likes.some(l => l.userId === userId) : false,
        likesCount: t._count.likes,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserTracks(profileUserId: string, requesterId?: string) {
    const tracks = await this.prisma.lazerTrack.findMany({
      where: {
        authorId: profileUserId,
        deletedAt: null,
        ...(requesterId !== profileUserId ? { isPublic: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        likes: { select: { userId: true } },
        collaborations: {
          include: { user: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } } }
        },
        _count: { select: { likes: true } },
      },
    });

    return tracks.map(t => ({
      ...t,
      liked: requesterId ? t.likes.some(l => l.userId === requesterId) : false,
      likesCount: t._count.likes,
    }));
  }

  async getRadioTracks(genre?: string) {
    const where: any = { deletedAt: null, isPublic: true };
    if (genre && genre !== 'Todos') where.genre = genre;

    const tracks = await this.prisma.lazerTrack.findMany({
      where,
      take: 50,
      orderBy: { plays: 'desc' },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        likes: { select: { userId: true } },
        collaborations: {
          include: { user: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } } }
        },
        _count: { select: { likes: true } },
      },
    });

    return tracks.sort(() => Math.random() - 0.5);
  }

  async incrementPlays(trackId: string, userId?: string) {
    const [track] = await this.prisma.$transaction([
      this.prisma.lazerTrack.update({
        where: { id: trackId },
        data: { plays: { increment: 1 } },
      }),
      this.prisma.lazerTrackPlay.create({
        data: {
          trackId,
          userId: userId || null,
        }
      })
    ]);
    return track;
  }

  async deleteTrack(trackId: string, userId: string) {
    const track = await this.prisma.lazerTrack.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');
    if (track.authorId !== userId) throw new ForbiddenException();
    await this.prisma.lazerTrack.update({ where: { id: trackId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  // ── LIKES ────────────────────────────────────────────────

  async likeTrack(trackId: string, userId: string) {
    const existing = await this.prisma.lazerTrackLike.findUnique({
      where: { trackId_userId: { trackId, userId } },
    });
    if (existing) {
      await this.prisma.lazerTrackLike.delete({ where: { trackId_userId: { trackId, userId } } });
      return { liked: false };
    }
    await this.prisma.lazerTrackLike.create({ data: { trackId, userId } });
    return { liked: true };
  }

  async getLikedTracks(userId: string) {
    const likes = await this.prisma.lazerTrackLike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        track: {
          include: {
            author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
            likes: { select: { userId: true } },
            _count: { select: { likes: true } },
          },
        },
      },
    });
    return likes
      .filter(l => !l.track.deletedAt)
      .map(l => ({ ...l.track, liked: true, likesCount: l.track._count.likes }));
  }

  // ── PLAYLISTS ────────────────────────────────────────────

  async createPlaylist(authorId: string, dto: { title: string; description?: string; coverUrl?: string; isPublic?: boolean }) {
    return this.prisma.lazerPlaylist.create({
      data: { authorId, title: dto.title, description: dto.description, coverUrl: dto.coverUrl, isPublic: dto.isPublic ?? true },
      include: { tracks: { include: { track: true } }, author: { select: { id: true, profile: { select: { username: true, avatarUrl: true } } } } },
    });
  }

  async getUserPlaylists(profileUserId: string, requesterId?: string) {
    return this.prisma.lazerPlaylist.findMany({
      where: {
        authorId: profileUserId,
        ...(requesterId !== profileUserId ? { isPublic: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tracks: true } },
        tracks: { take: 4, orderBy: { position: 'asc' }, include: { track: { select: { coverUrl: true } } } },
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true } } } },
      },
    });
  }

  async getPlaylist(playlistId: string) {
    const pl = await this.prisma.lazerPlaylist.findUnique({
      where: { id: playlistId },
      include: {
        author: { select: { id: true, profile: { select: { username: true, avatarUrl: true, displayName: true } } } },
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: {
              include: {
                author: { select: { id: true, profile: { select: { username: true, avatarUrl: true } } } },
                _count: { select: { likes: true } },
              },
            },
          },
        },
      },
    });
    if (!pl) throw new NotFoundException('Playlist not found');
    return pl;
  }

  async addTrackToPlaylist(playlistId: string, trackId: string, userId: string) {
    const pl = await this.prisma.lazerPlaylist.findUnique({ where: { id: playlistId } });
    if (!pl) throw new NotFoundException();
    if (pl.authorId !== userId) throw new ForbiddenException();
    const count = await this.prisma.lazerPlaylistTrack.count({ where: { playlistId } });
    return this.prisma.lazerPlaylistTrack.upsert({
      where: { playlistId_trackId: { playlistId, trackId } },
      create: { playlistId, trackId, position: count },
      update: {},
    });
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string, userId: string) {
    const pl = await this.prisma.lazerPlaylist.findUnique({ where: { id: playlistId } });
    if (!pl) throw new NotFoundException();
    if (pl.authorId !== userId) throw new ForbiddenException();
    await this.prisma.lazerPlaylistTrack.delete({ where: { playlistId_trackId: { playlistId, trackId } } });
    return { success: true };
  }

  // ── FILE UPLOAD ────────────────────────────────────────────

  saveAudioUpload(userId: string, file: Express.Multer.File): string {
    const dir = path.join(process.cwd(), 'uploads', 'music', userId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.originalname) || '.mp3';
    const filename = `track_${Date.now()}${ext}`;
    const dest = path.join(dir, filename);
    fs.writeFileSync(dest, file.buffer);
    return `/uploads/music/${userId}/${filename}`;
  }

  saveCoverUpload(userId: string, file: Express.Multer.File): string {
    const dir = path.join(process.cwd(), 'uploads', 'music', userId, 'covers');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `cover_${Date.now()}${ext}`;
    const dest = path.join(dir, filename);
    fs.writeFileSync(dest, file.buffer);
    return `/uploads/music/${userId}/covers/${filename}`;
  }
}
