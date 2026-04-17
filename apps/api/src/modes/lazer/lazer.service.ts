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

  // ── Posts ──────────────────────────────────────────────────────────

  async createPost(dto: CreatePostLazerDto, userId: string) {
    const post = await this.prisma.lazerPost.create({
      data: {
        content: dto.content,
        imageUrl: dto.imageUrl,
        tag: dto.tag,
        isSparkle: dto.isSparkle ?? false,
        titleFont: dto.titleFont,
        titleColor: dto.titleColor,
        authorId: userId,
        communityId: dto.communityId || null,
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

  async updatePost(id: string, dto: UpdatePostLazerDto, userId: string) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.lazerPost.update({
      where: { id },
      data: {
        content: dto.content,
        imageUrl: dto.imageUrl,
        tag: dto.tag,
        titleFont: dto.titleFont,
        titleColor: dto.titleColor,
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