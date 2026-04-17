import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MediaService } from '../../../common/services/media.service';
import { CreateLazerCommunityDto, UpdateLazerCommunityDto, CreateLazerCommunityRuleDto } from './lazer-community.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class LazerCommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  private mapCommunity(community: any, userId?: string) {
    if (!community) return null;
    const role = userId ? (community.members?.find((m: any) => m.userId === userId)?.role || 'none') : 'none';
    return {
      ...community,
      role: community.role || role,
      membersCount: community._count?.members ?? 0,
      onlineCount: 0, // Placeholder for future real-time logic
    };
  }

  async create(ownerId: string, dto: CreateLazerCommunityDto) {
    const inviteCode = randomUUID().slice(0, 8).toUpperCase();
    
    const community = await this.prisma.lazerCommunity.create({
      data: {
        ...dto,
        ownerId,
        inviteCode,
        members: {
          create: { userId: ownerId, role: 'admin' }
        },
        rules: {
          create: { text: 'Sê respeitoso com todos os membros.' }
        }
      },
      include: {
        rules: true,
        members: true,
        _count: { select: { members: true } }
      }
    });

    return { success: true, data: this.mapCommunity(community, ownerId) };
  }

  async getMyCommunities(userId: string) {
    const memberships = await this.prisma.lazerCommunityMember.findMany({
      where: { userId },
      include: {
        community: {
          include: {
            rules: true,
            members: { where: { userId } },
            _count: { select: { members: true } }
          }
        }
      }
    });

    return { 
      success: true, 
      data: memberships.map(m => this.mapCommunity(m.community, userId))
    };
  }

  async getAllPublic() {
    const communities = await this.prisma.lazerCommunity.findMany({
      where: { isPublic: true, deletedAt: null },
      include: {
        rules: true,
        _count: { select: { members: true } }
      },
      take: 20
    });

    return { 
      success: true, 
      data: communities.map(c => this.mapCommunity(c))
    };
  }

  async findOne(id: string, userId: string) {
    const community = await this.prisma.lazerCommunity.findUnique({
      where: { id },
      include: {
        rules: true,
        members: { where: { userId } },
        _count: { select: { members: true } }
      }
    });

    if (!community || community.deletedAt) throw new NotFoundException('Comunidade não encontrada.');

    return { 
      success: true, 
      data: this.mapCommunity(community, userId)
    };
  }

  async update(id: string, userId: string, dto: UpdateLazerCommunityDto) {
    const com = await this.prisma.lazerCommunity.findUnique({ where: { id } });
    if (!com) throw new NotFoundException('Comunidade não encontrada.');
    if (com.ownerId !== userId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.lazerCommunity.update({
      where: { id },
      data: dto,
      include: {
        rules: true,
        members: { where: { userId } },
        _count: { select: { members: true } }
      }
    });

    return { success: true, data: this.mapCommunity(updated, userId) };
  }

  async joinByInvite(inviteCode: string, userId: string) {
    const com = await this.prisma.lazerCommunity.findUnique({ where: { inviteCode } });
    if (!com || com.deletedAt) throw new NotFoundException('Código de convite inválido.');

    const existing = await this.prisma.lazerCommunityMember.findUnique({
      where: { communityId_userId: { communityId: com.id, userId } }
    });

    if (!existing) {
      await this.prisma.lazerCommunityMember.create({
        data: { communityId: com.id, userId, role: 'member' }
      });
    }

    const updated = await this.prisma.lazerCommunity.findUnique({
      where: { id: com.id },
      include: {
        rules: true,
        members: { where: { userId } },
        _count: { select: { members: true } }
      }
    });

    return { success: true, data: this.mapCommunity(updated, userId) };
  }

  async leave(id: string, userId: string) {
    const com = await this.prisma.lazerCommunity.findUnique({ where: { id } });
    if (!com) throw new NotFoundException('Comunidade não encontrada.');
    if (com.ownerId === userId) throw new ForbiddenException('O dono não pode sair da própria comunidade.');

    await this.prisma.lazerCommunityMember.deleteMany({
      where: { communityId: id, userId }
    });

    return { success: true };
  }

  // Rules
  async addRule(id: string, userId: string, dto: CreateLazerCommunityRuleDto) {
    const com = await this.prisma.lazerCommunity.findUnique({ where: { id } });
    if (!com) throw new NotFoundException('Comunidade não encontrada.');
    if (com.ownerId !== userId) throw new ForbiddenException('Sem permissão.');

    const rule = await this.prisma.lazerCommunityRule.create({
      data: { communityId: id, text: dto.text }
    });

    return { success: true, data: rule };
  }

  async removeRule(ruleId: string, userId: string) {
    const rule = await this.prisma.lazerCommunityRule.findUnique({
      where: { id: ruleId },
      include: { community: true }
    });

    if (!rule) throw new NotFoundException('Regra não encontrada.');
    if (rule.community.ownerId !== userId) throw new ForbiddenException('Sem permissão.');

    await this.prisma.lazerCommunityRule.delete({ where: { id: ruleId } });

    return { success: true };
  }

  // Media
  async saveCommunityMedia(id: string, userId: string, file: Express.Multer.File) {
    const com = await this.prisma.lazerCommunity.findUnique({ where: { id } });
    if (!com) throw new NotFoundException('Comunidade não encontrada.');
    if (com.ownerId !== userId) throw new ForbiddenException('Sem permissão.');

    const url = await this.mediaService.saveValidatedMedia(file, 'lazer-communities', {
      maxFileSizeMb: 10,
      allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
      maxVideoDurationSecs: 300,
    });

    return { url };
  }
}
