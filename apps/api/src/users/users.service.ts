import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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
  constructor(private readonly prisma: PrismaService) {}

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

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string }) {
    return this.prisma.profile.update({
      where: { userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });
  }

  async saveProfileAvatar(userId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Ficheiro em falta.');
    const max = 5 * 1024 * 1024;
    if (file.size > max) throw new BadRequestException('Ficheiro demasiado grande (máx. 5MB).');
    
    // Validar que é uma imagem
    const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validMimes.includes(file.mimetype)) {
      throw new BadRequestException('Apenas são permitidas imagens (JPEG, PNG, GIF, WebP).');
    }

    const ext = (file.originalname.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] ?? '').slice(0, 8);
    const name = `${randomUUID()}${ext || '.jpg'}`;
    const dir = join(process.cwd(), 'uploads', 'profiles');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), file.buffer);
    
    const origin = process.env.API_PUBLIC_ORIGIN ?? `http://localhost:${process.env.API_PORT ?? 3001}`;
    const url = `${origin.replace(/\/$/, '')}/uploads/profiles/${name}`;
    
    // Atualizar avatar na base de dados
    const updated = await this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl: url },
    });
    
    return { url, profile: updated };
  }
}
