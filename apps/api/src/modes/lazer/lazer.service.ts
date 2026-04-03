import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateLazerDto } from "./dto/create-lazer.dto";
import { UpdateLazerDto } from "./dto/update-lazer.dto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LazerService {
  @Inject()
  private readonly prisma: PrismaService;

  async createPost(
    createLazerDto: CreateLazerDto,
    authorId: string,
  ): Promise<any> {

    return await this.prisma.lazerPost.create({
      data: {
        authorId,
        content: createLazerDto.content,
        imageUrl: createLazerDto.imageUrl,
      },
    });
  }

  async getFeed(cursor?: string, limit = 20) {

  const posts = await this.prisma.lazerPost.findMany({
    where: { deletedAt: null },

    orderBy: { createdAt: 'desc' },

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
    hasMore
    }
  };
  }
  async findOnePost(id: string): Promise<any> {
    return await this.prisma.lazerPost.findUnique({
      where: { id },
    });
  }

  async updatePost(id: string, updateLazerDto: UpdateLazerDto) {
    return await this.prisma.lazerPost.update({
      where: { id },
      data: updateLazerDto,
    });
  }

  removePost(id: string) {
    return this.prisma.lazerPost.delete({
      where: { id },
    });
  }
}
