import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { MediaService } from "../common/services/media.service";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.profile.findUnique({
      where: { username },
      include: { user: true },
    });
  }

  async createUser(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        provider: data.provider || "email",
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
    return this.prisma.profile.update({
      where: { userId },
      data: { activeModes: modes },
    });
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string; bannerUrl?: string; bannerColor?: string }) {
    return this.prisma.profile.update({
      where: { userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
        ...(data.bannerColor !== undefined && { bannerColor: data.bannerColor }),
      },
    });
  }

  async saveProfileAvatar(userId: string, file: Express.Multer.File) {
    const url = await this.mediaService.saveValidatedMedia(file, 'profiles', {
      maxFileSizeMb: 5,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
      maxVideoDurationSecs: 5,
    });
    
    // Atualizar avatar na base de dados
    const updated = await this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl: url },
    });
    
    return { url, profile: updated };
  }
}
