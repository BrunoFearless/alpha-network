import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostLazerDto } from './dto/createPost-lazer.dto';
import { UpdatePostLazerDto } from './dto/updatePost-lazer.dto';
import { CreateCommentsLazerDto } from './dto/createComments-lazer.dto';
import { ToggleRequestDTO } from './dto/toggleRequest-lazer.dto';
import { ToggleResponseDTO } from './dto/toggleResponse.dto';

@Injectable()
export class LazerService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(dto: CreatePostLazerDto, authorId: string) {
    return this.prisma.lazerPost.create({
      data: {
        authorId,
        content: createPostLazerDto.content,
        imageUrl: createPostLazerDto.imageUrl,
        tag: createPostLazerDto.tag,
        isSparkle: createPostLazerDto.isSparkle,
        titleFont: createPostLazerDto.titleFont,
        titleColor: createPostLazerDto.titleColor,
      },
      include: {
        author: { include: { profile: true } },
        _count: { select: { reactions: true, comments: true } },
      },
    });
  }

  async getFeed(cursor?: string, limit = 20) {
    const take = Math.min(limit, 50);
    const posts = await this.prisma.lazerPost.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        author: { include: { profile: true } },
        _count: { select: { reactions: true, comments: true } },
      },
    });

    const hasMore = posts.length > take;
    const data = hasMore ? posts.slice(0, -1) : posts;

    // Hidratar autores
    const authorIds = [...new Set(data.map(p => p.authorId))];
    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: authorIds } },
      select: { userId: true, username: true, displayName: true, avatarUrl: true },
    });
    const pm = new Map(profiles.map(p => [p.userId, p]));

    const hydrated = data.map(p => ({
      ...p,
      author: pm.get(p.authorId) ?? {
        userId: p.authorId,
        username: 'utilizador',
        displayName: null,
        avatarUrl: null,
      },
    }));

    return {
      data: hydrated,
      meta: {
        nextCursor: hasMore ? data.at(-1)?.id : null,
        hasMore,
      },
    };
  }

  async getUserPosts(userId: string) {
    return await this.prisma.lazerPost.findMany({
      where: { 
        authorId: userId,
        deletedAt: null 
      },
      orderBy: { createdAt: "desc" },
      include: {
        author: { include: { profile: true } },
        _count: { select: { reactions: true, comments: true } },
      },
    });
  }

  async findOnePost(id: string): Promise<any> {
    return await this.prisma.lazerPost.findUnique({
      where: { id },
      include: { _count: { select: { reactions: true, comments: true } } },
    });
    if (!post || post.deletedAt) throw new NotFoundException('Post não encontrado.');

    const profile = await this.prisma.profile.findUnique({
      where: { userId: post.authorId },
      select: { userId: true, username: true, displayName: true, avatarUrl: true },
    });

    return { ...post, author: profile };
  }

  async updatePost(id: string, dto: UpdatePostLazerDto, userId: string) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id } });
    if (!post || post.deletedAt) throw new NotFoundException('Post não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Não podes editar este post.');
    return this.prisma.lazerPost.update({ where: { id }, data: dto });
  }

  async pinPost(id: string, userId: string) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id } });
    if (!post) throw new Error('Post not found');
    if (post.authorId !== userId) throw new Error('Not authorized to pin this post');
    return await this.prisma.lazerPost.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });
  }

  async softDeletePost(id: string, userId: string) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id } });
    if (!post || post.deletedAt) throw new NotFoundException('Post não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Não podes apagar este post.');

    await this.prisma.lazerComment.updateMany({
      where: { postId: id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.lazerReaction.deleteMany({ where: { postId: id } });

    return this.prisma.lazerPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async toggleReaction(dto: ToggleRequestDTO, userId: string): Promise<ToggleResponseDTO> {
    const { postId } = dto;

    const post = await this.prisma.lazerPost.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post não encontrado.');

    const existing = await this.prisma.lazerReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.lazerReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.lazerReaction.create({
        data: { postId, userId, type: 'like' },
      });
    }

    const reactionCount = await this.prisma.lazerReaction.count({ where: { postId } });
    return { liked: !existing, reactionCount };
  }

  async createComment(postId: string, authorId: string, dto: CreateCommentsLazerDto) {
    const post = await this.prisma.lazerPost.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Post não encontrado.');

    const comment = await this.prisma.lazerComment.create({
      data: { postId, authorId, content: dto.content },
    });
    if (!exist) throw new Error("Post not found");
    return await this.prisma.lazerComment.create({
      data: {
        postId: postId,
        authorId: authorId,
        content: comment,
      },
      include: {
        author: { include: { profile: true } },
      },
    });

    return { ...comment, author: profile };
  }

  async updateComment(commentId: string, userId: string, dto: CreateCommentsLazerDto) {
    const comment = await this.prisma.lazerComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comentário não encontrado.');
    if (comment.authorId !== userId) throw new ForbiddenException('Não podes editar este comentário.');
    return this.prisma.lazerComment.update({
      where: { id: commentId },
      data: { content: dto.content },
    });
  }

  async findComments(postId: string): Promise<any> {
    return await this.prisma.lazerComment.findMany({
      where: {
        postId: postId,
        deletedAt: null,
      },
      include: {
        author: { include: { profile: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const authorIds = [...new Set(comments.map(c => c.authorId))];
    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: authorIds } },
      select: { userId: true, username: true, displayName: true, avatarUrl: true },
    });
    const pm = new Map(profiles.map(p => [p.userId, p]));

    return comments.map(c => ({
      ...c,
      author: pm.get(c.authorId) ?? null,
    }));
  }

  async softDeleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.lazerComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comentário não encontrado.');
    if (comment.authorId !== userId) throw new ForbiddenException('Não podes apagar este comentário.');
    return this.prisma.lazerComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }
}