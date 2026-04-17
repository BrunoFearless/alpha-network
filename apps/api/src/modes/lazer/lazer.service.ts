// ══════════════════════════════════════════════════════════
// CORREÇÃO DO LAZER SERVICE
// apps/api/src/modes/lazer/lazer.service.ts
//
// PROBLEMA RAIZ: getFeed() e getUserPosts() não incluíam
// author.profile no include do Prisma, então o frontend
// recebia posts sem as informações do autor.
//
// CORREÇÃO: Adicionar include: { author: { include: { profile: true } } }
// em todas as queries que retornam posts.
// ══════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostLazerDto } from './dto/createPost-lazer.dto';
import { UpdatePostLazerDto } from './dto/updatePost-lazer.dto';
import { CreateCommentsLazerDto } from './dto/createComments-lazer.dto';
import { ToggleRequestDTO } from './dto/toggleRequest-lazer.dto';

// Reutilizável: sempre incluir author.profile nos posts
const POST_INCLUDE = {
  author: {
    include: {
      profile: true,
    },
  },
  _count: {
    select: {
      reactions: true,
      comments: true,
    },
  },
  tropes: true,
} as const;

const COMMENT_INCLUDE = {
  author: {
    include: {
      profile: true,
    },
  },
} as const;

@Injectable()
export class LazerService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(dto: any, userId: string) {
    let tropeConnections: { id: string }[] = [];

    if (dto.tropeNames && dto.tropeNames.length > 0) {
      for (let name of dto.tropeNames) {
        let cleanName = name.replace('#', '').trim();
        if (!cleanName) continue;
        
        let trope = await this.prisma.lazerTrope.findUnique({ where: { name: cleanName } });
        if (trope) {
          tropeConnections.push({ id: trope.id });
        }
      }
    }

    const post = await this.prisma.lazerPost.create({
      data: {
        content: dto.content,
        imageUrl: dto.imageUrl,
        isSparkle: dto.isSparkle ?? false,
        titleFont: dto.titleFont,
        titleColor: dto.titleColor,
        authorId: userId,
        communityId: dto.communityId || null,
        tropes: tropeConnections.length > 0 ? { connect: tropeConnections } : undefined,
      },
      include: POST_INCLUDE,
    });
    return { success: true, data: post };
  }

  async getFeed(cursor?: string, limit = 20, communityId?: string) {
    const posts = await this.prisma.lazerPost.findMany({
      where: { 
        deletedAt: null,
        ...(communityId ? { communityId } : {})
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: POST_INCLUDE, // ← CRITICAL: includes author.profile
    });
    return { success: true, data: posts };
  }

  async findOnePost(id: string) {
    const post = await this.prisma.lazerPost.findUnique({
      where: { id },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException('Post não encontrado.');
    return { success: true, data: post };
  }

  async getUserPosts(userId: string) {
    const posts = await this.prisma.lazerPost.findMany({
      where: { authorId: userId, deletedAt: null },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: POST_INCLUDE, // ← CRITICAL: includes author.profile
    });
    return { success: true, data: posts };
  }

  async updatePost(id: string, dto: any, userId: string) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão.');

    let tropeConnections: { id: string }[] | undefined = undefined;

    if (dto.tropeNames) {
      tropeConnections = [];
      for (let name of dto.tropeNames) {
        let cleanName = name.replace('#', '').trim();
        if (!cleanName) continue;
        
        let trope = await this.prisma.lazerTrope.findUnique({ where: { name: cleanName } });
        if (trope) {
          tropeConnections.push({ id: trope.id });
        }
      }
    }

    const updated = await this.prisma.lazerPost.update({
      where: { id },
      data: {
        content: dto.content,
        imageUrl: dto.imageUrl,
        titleFont: dto.titleFont,
        titleColor: dto.titleColor,
        tropes: tropeConnections ? { set: tropeConnections } : undefined,
      },
      include: POST_INCLUDE,
    });
    return { success: true, data: updated };
  }

  async deletePost(id: string, userId: string) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão.');

    // Soft delete
    await this.prisma.lazerPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async pinPost(id: string, userId: string) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.lazerPost.update({
      where: { id },
      data: { isPinned: !post.isPinned },
      include: POST_INCLUDE,
    });
    return { success: true, data: updated };
  }

  // ── Tropes ─────────────────────────────────────────────────────────

  async getAllTropes() {
    const tropes = await this.prisma.lazerTrope.findMany({
      orderBy: { name: 'asc' }
    });
    return { success: true, data: tropes };
  }

  async createTrope(name: string, description?: string, iconEmoji?: string, category?: string) {
    // Check if it exists
    const existing = await this.prisma.lazerTrope.findUnique({ where: { name } });
    if (existing) return { success: true, data: existing };

    const trope = await this.prisma.lazerTrope.create({
      data: {
        name,
        description,
        iconEmoji: iconEmoji || '✨',
        category: category || 'General',
      }
    });
    return { success: true, data: trope };
  }

  async getTrendingTropes() {
    // Aggregation logic for Tropes used in Communities in the last 24h
    // We get posts created in the last 24 hours that belong to a community
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const posts = await this.prisma.lazerPost.findMany({
      where: {
        deletedAt: null,
        communityId: { not: null }, // ONLY posts from a community
        createdAt: { gte: yesterday }
      },
      include: {
        tropes: true,
        _count: {
          select: { reactions: true, comments: true }
        }
      }
    });

    const metricsMap = new Map<string, { trope: any, sparkles: number, talking: number, count: number }>();

    posts.forEach(post => {
      post.tropes.forEach(trope => {
        if (!metricsMap.has(trope.id)) {
          metricsMap.set(trope.id, { trope, sparkles: 0, talking: 0, count: 0 });
        }
        const data = metricsMap.get(trope.id)!;
        data.sparkles += post._count.reactions;
        data.talking += post._count.comments;
        data.count += 1;
      });
    });

    const trending = Array.from(metricsMap.values())
      .map(item => ({
        ...item.trope,
        metrics: {
          sparkles: item.sparkles,
          talking: item.talking,
          postCount: item.count
        },
        // Score logic: 1 post = 10pts, 1 sparkle = 2pts, 1 comment = 5pts
        score: (item.count * 10) + (item.sparkles * 2) + (item.talking * 5)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Get top 50

    return { success: true, data: trending };
  }

  // ── Reactions ─────────────────────────────────────────────────────

  async toggleReaction(dto: ToggleRequestDTO, userId: string) {
    const existing = await this.prisma.lazerReaction.findFirst({
      where: { postId: dto.postId, userId: userId },
    });

    if (existing) {
      await this.prisma.lazerReaction.delete({ where: { id: existing.id } });
      const count = await this.prisma.lazerReaction.count({ where: { postId: dto.postId } });
      return { success: true, data: { liked: false, reactionCount: count } };
    } else {
      await this.prisma.lazerReaction.create({
        data: { postId: dto.postId, userId: userId },
      });
      const count = await this.prisma.lazerReaction.count({ where: { postId: dto.postId } });
      return { success: true, data: { liked: true, reactionCount: count } };
    }
  }

  // ── Comments ──────────────────────────────────────────────────────

  async getComments(postId: string) {
    const comments = await this.prisma.lazerComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: COMMENT_INCLUDE, // ← CRITICAL: includes author.profile
    });
    return { success: true, data: comments };
  }

  async createComment(postId: string, dto: CreateCommentsLazerDto, userId: string) {
    const comment = await this.prisma.lazerComment.create({
      data: {
        postId,
        content: dto.content,
        parentId: dto.parentId ?? null,
        authorId: userId,
      },
      include: COMMENT_INCLUDE, // ← CRITICAL: includes author.profile
    });
    return { success: true, data: comment };
  }

  async updateComment(commentId: string, userId: string, dto: CreateCommentsLazerDto) {
    const comment = await this.prisma.lazerComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado.');
    if (comment.authorId !== userId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.lazerComment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: COMMENT_INCLUDE,
    });
    return { success: true, data: updated };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.lazerComment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado.');

    const isAuthor = comment.authorId === userId;
    const isPostOwner = comment.post?.authorId === userId;
    if (!isAuthor && !isPostOwner) throw new ForbiddenException('Sem permissão.');

    await this.prisma.lazerComment.delete({ where: { id: commentId } });
    return { success: true };
  }
}