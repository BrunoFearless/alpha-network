import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";

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
  async updateProfile(userId: string, data: UpdateUserDto) {
    return this.prisma.profile.update({
      where: { userId },
      data,
    });
  }

  async softDelete(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })
  }
}
