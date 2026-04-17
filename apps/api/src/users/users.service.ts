import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, readdir, unlink } from 'fs/promises';
import { join, extname } from 'path';

interface CreateUserData {
  email: string;
  passwordHash?: string;
  provider?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user || user.deletedAt) return null;
    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user || user.deletedAt) return null;
    return user;
  }

  async findByUsername(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: { user: true },
    });
    if (!profile || profile.user.deletedAt) return null;
    return profile;
  }

  async createUser(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        provider: data.provider || 'email',
        profile: {
          create: {
            username: data.username,
            displayName: data.displayName || data.username,
            avatarUrl: data.avatarUrl,
          },
        },
      },
      include: { profile: true },
    });
  }

  async updateActiveModes(userId: string, modes: string[]) {
    // activeModes is a String[] in prisma schema
    return this.prisma.profile.update({
      where: { userId },
      data: { activeModes: { set: modes } },
    });
  }

  async updateProfile(userId: string, data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    bannerColor?: string;
    auroraTheme?: string;
    nameFont?: string;
    nameEffect?: string;
    nameColor?: string;
    status?: string;
    tags?: string;
    lazerData?: any;
  }) {
    return this.prisma.profile.update({
      where: { userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
        ...(data.bannerColor !== undefined && { bannerColor: data.bannerColor }),
        ...(data.auroraTheme !== undefined && { auroraTheme: data.auroraTheme }),
        ...(data.nameFont !== undefined && { nameFont: data.nameFont }),
        ...(data.nameEffect !== undefined && { nameEffect: data.nameEffect }),
        ...(data.nameColor !== undefined && { nameColor: data.nameColor }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.lazerData !== undefined && { lazerData: data.lazerData }),
      },
    });
  }

  async saveUserUpload(
    userId: string,
    type: 'avatar' | 'banner',
    file: Express.Multer.File,
  ): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'users', userId, type);
    await mkdir(dir, { recursive: true });

    // Apagar ficheiros antigos do mesmo tipo
    try {
      const existing = await readdir(dir);
      await Promise.all(
        existing.map(f => unlink(join(dir, f)).catch(() => { })),
      );
    } catch { /* pasta vazia */ }

    const ext = extname(file.originalname) || this.mimeToExt(file.mimetype);
    const filename = `${type}-${Date.now()}${ext}`;
    await writeFile(join(dir, filename), file.buffer);

    const origin =
      process.env.API_PUBLIC_ORIGIN ??
      `http://localhost:${process.env.API_PORT ?? 3001}`;

    return `${origin.replace(/\/$/, '')}/uploads/users/${userId}/${type}/${filename}`;
  }

  async softDeleteUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
    };
    return map[mime] ?? '';
  }

  // ── Sistema de Seguimento ──────────────────────────────────────────────────
  async findByIdWithDeleted(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: { profile: true }
    })
  }

  async countFollowers(followingId: string) {
    return await this.prisma.follow.count({ where: { followingId } })
  }

  async countFollowings(followerId: string) {
    return await this.prisma.follow.count({ where: { followerId } })
  }

  async isFollowing(targetId: string, requesterId: string): Promise<boolean> {
    const result = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: requesterId,
          followingId: targetId,
        },
      },
    });

    return !!result
  }

  async getFullProfile(username: string, requesterId?: string) {
    const profile = await this.findByUsername(username);

    if (!profile) return null;

    const [followersCount, followingCount, isFollowing] = await Promise.all([
      this.countFollowers(profile.userId),
      this.countFollowings(profile.userId),
      requesterId
        ? this.isFollowing(profile.userId, requesterId)
        : false
    ])

    const { emailVerified, passwordHash, deletedAt, ...safeUser } = profile.user as any;

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      activeModes: profile.activeModes,
      followersCount,
      followingCount,
      isFollowing,
      createdAt: profile.createdAt,
      user: safeUser
    };
  }

  async follow(followerId: string, targetUsername: string) {
    const target = await this.findByUsername(targetUsername)
    if (!target) throw new NotFoundException('utilizador não encontrado')
    if (target.userId === followerId) throw new BadRequestException('não pode seguir-te a ti mesmo')

    return await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId: target.userId
        }
      },
      update: {},
      create: { followerId, followingId: target.userId },
    })
  }

  async unfollow(followerId: string, targetUsername: string) {
    const target = await this.findByUsername(targetUsername)
    if (!target) throw new NotFoundException("Utilizador não encontrado")

    return await this.prisma.follow.deleteMany({
      where: {
        followerId: followerId,
        followingId: target.userId
      }
    })
  }

  async getFollowings(username: string) {
    const target = await this.findByUsername(username);
    if (!target) throw new NotFoundException('Utilizador não encontrado');

    const followRecords = await this.prisma.follow.findMany({
      where: { followerId: target.userId },
      select: { followingId: true }
    });

    const followingIds = followRecords.map(f => f.followingId);

    return await this.prisma.profile.findMany({
      where: {
        userId: { in: followingIds }
      },
      select: {
        userId: true,
        username: true,
        displayName: true,
        avatarUrl: true
      }
    });
  }

  async getFollowers(username: string) {
    const target = await this.findByUsername(username);
    if (!target) throw new NotFoundException('Utilizador não encontrado');

    const followRecords = await this.prisma.follow.findMany({
      where: { followingId: target.userId },
      select: { followerId: true }
    });

    const followerIds = followRecords.map(f => f.followerId);

    return await this.prisma.profile.findMany({
      where: { userId: { in: followerIds } },
      select: {
        userId: true,
        username: true,
        displayName: true,
        avatarUrl: true
      }
    });
  }
}