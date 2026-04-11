import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || user.deletedAt) return null

    return user
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user || user.deletedAt) return null

    return user

  }

  async findByUsername(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: { user: true },
    });

    if (!profile || profile.user.deletedAt) return null

    return profile
  }

  async countFollowers(followingId: string) {
    return await this.prisma.follow.count({ where: { followingId } })
  }

  async countFollowings(followerId: string) {
    return await this.prisma.follow.count({ where: { followerId } })
  }

  async isFollowing(targetId: string, requesterId: string): Promise<boolean> {
    console.log(`Verificando se ${requesterId} segue ${targetId}`);
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
      createdAt: profile.createdAt
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
    // 1. Encontrar o perfil do utilizador que queremos ver quem ele segue
    const target = await this.findByUsername(username);
    if (!target) throw new NotFoundException('Utilizador não encontrado');

    // 2. Procurar na tabela follows todos os registos onde este user é o seguidor
    const followRecords = await this.prisma.follow.findMany({
      where: { followerId: target.userId },
      select: { followingId: true }
    });

    // 3. Criar um array apenas com os IDs de quem está a ser seguido
    const followingIds = followRecords.map(f => f.followingId);

    // 4. Buscar os perfis desses IDs para retornar uma lista legível
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

    // 2. Buscamos todos os registos onde o 'followingId' é o do alvo
    const followRecords = await this.prisma.follow.findMany({
      where: { followingId: target.userId },
      select: { followerId: true }
    });

    // 3. Extraímos apenas os IDs de quem segue
    const followerIds = followRecords.map(f => f.followerId);

    // 4. Buscamos os dados dos perfis desses IDs
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
