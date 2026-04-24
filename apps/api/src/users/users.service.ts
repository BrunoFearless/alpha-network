import { Injectable, NotFoundException } from '@nestjs/common';
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
      include: { profile: true, alphaAI: true },
    });
    if (!user || user.deletedAt) return null;
    return user;
  }

  async findByUsername(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: { user: { include: { alphaAI: true } } },
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
    type: 'avatar' | 'banner' | 'ai-avatar' | 'ai-banner',
    file: Express.Multer.File,
  ): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'users', userId, type);
    await mkdir(dir, { recursive: true });

    // Apagar ficheiros antigos do mesmo tipo
    try {
      const existing = await readdir(dir);
      await Promise.all(
        existing.map(f => unlink(join(dir, f)).catch(() => {})),
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
}