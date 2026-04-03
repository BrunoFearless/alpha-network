import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreatePostLazerDto } from "./dto/createPost-lazer.dto";
import { UpdatePostLazerDto } from "./dto/updatePost-lazer.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { ToggleRequestDTO } from "./dto/toggleRequest-lazer.dto";
import { ToggleResponseDTO } from "./dto/toggleResponse.dto";

@Injectable()
export class LazerService {
  @Inject()
  private readonly prisma: PrismaService;

  async createPost(
    createPostLazerDto: CreatePostLazerDto,
    authorId: string,
  ): Promise<any> {
    return await this.prisma.lazerPost.create({
      data: {
        authorId,
        content: createPostLazerDto.content,
        imageUrl: createPostLazerDto.imageUrl,
      },
    });
  }

  async getFeed(cursor?: string, limit = 20) {
    const posts = await this.prisma.lazerPost.findMany({
      where: { deletedAt: null },

      orderBy: { createdAt: "desc" },

      take: limit + 1,

      cursor: cursor ? { id: cursor } : undefined,

      skip: cursor ? 1 : 0,

      include: {
        _count: { select: { reactions: true, comments: true } },
      },
    });
    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, -1) : posts;
    return {
      data,
      meta: {
        nextCursor: hasMore ? data.at(-1)?.id : null,
        hasMore,
      },
    };
  }
  async findOnePost(id: string): Promise<any> {
    return await this.prisma.lazerPost.findUnique({
      where: { id },
    });
  }

  async updatePost(id: string, updatePostLazerDto: UpdatePostLazerDto) {
    return await this.prisma.lazerPost.update({
      where: { id },
      data: updatePostLazerDto,
    });
  }

  removePost(id: string) {
    return this.prisma.lazerPost.delete({
      where: { id },
    });
  }

  async toggleReaction(
  toggleRequest: ToggleRequestDTO,
  userId: string,
): Promise<ToggleResponseDTO> {

  const { postId } = toggleRequest;

  const existing = await this.prisma.lazerReaction.findUnique({
    where: {
      postId_userId: { postId, userId },
    },
  });

  if (existing) {
    await this.prisma.lazerReaction.delete({
      where: { id: existing.id },
    });
  } else {
    await this.prisma.lazerReaction.create({
      data: {
        postId,
        userId,
        type: 'like',
      },
    });
  }

  const reactionCount = await this.prisma.lazerReaction.count({
    where: { postId },
  });

  return {
    liked: !existing,
    reactionCount,
  };
}
}
