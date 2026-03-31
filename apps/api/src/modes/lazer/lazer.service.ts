import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateLazerDto } from "./dto/create-lazer.dto";
import { UpdateLazerDto } from "./dto/update-lazer.dto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LazerService {
  @Inject()
  private readonly prisma: PrismaService;

 async createPost(createLazerDto: CreateLazerDto, authorId: string): Promise<any> {
  console.log("DTO:", JSON.stringify(createLazerDto));
  console.log(
    "content:",
    createLazerDto.content,
    typeof createLazerDto.content,
  );
  console.log("password:", authorId, typeof authorId);

    return await this.prisma.lazerPost.create({
      data: {authorId,
        content: createLazerDto.content,
        imageUrl: createLazerDto.imageUrl,
      },
    });
  }

  async findAllPosts(): Promise<any[]> {
     return await this.prisma.lazerPost.findMany({
      include: { comments: true },
    });
  }

  async findOnePost(id: string): Promise<any> {
    return await this.prisma.lazerPost.findUnique({
       where: { id } });
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
