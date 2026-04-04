import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { LazerService } from "./lazer.service";
import { CreatePostLazerDto } from "./dto/createPost-lazer.dto";
import { UpdatePostLazerDto } from "./dto/updatePost-lazer.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ToggleRequestDTO } from "./dto/toggleRequest-lazer.dto";
import { CreateCommentsLazerDto } from "./dto/createComments-lazer.dto";

@Controller("lazer/")
export class LazerController {
  constructor(private readonly lazerService: LazerService) {}

  @Post("/posts")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createPost(
    @Body()
    createPostLazerDto: CreatePostLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.createPost(createPostLazerDto, req.user.id);
  }

  @Get("feed")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  findAllPosts() {
    return this.lazerService.getFeed();
  }

  @Get("/posts/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  findOnePost(@Param("id") id: string) {
    return this.lazerService.findOnePost(id);
  }

  @Patch("posts/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updatePost(
    @Param("id") id: string,
    @Body() updatePostLazerDto: UpdatePostLazerDto,
  ) {
    return this.lazerService.updatePost(id, updatePostLazerDto);
  }

  @Post("posts/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removePost(@Param("id") id: string, @Request() req: any) {
    return this.lazerService.softDeletePost(id, req.user.id);
  }

  @Post("/posts/reactions")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  toggleReaction(@Body() toggleRequest: ToggleRequestDTO, @Request() req: any) {
    return this.lazerService.toggleReaction(toggleRequest, req.user.id);
  }

  @Post("/posts/:id/comments")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @Param("id") postId: string,
    @Body()
    comment: CreateCommentsLazerDto,
    @Request() req: any,
  ) {
    
    return this.lazerService.createComment(postId, req.user.id, comment.content);
  }

  @Get("/posts/:id/comments")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getComment(@Param("id") id: string) {
    return this.lazerService.findComments(id);
  }

  @Post("/posts/:id/comments/soft-delete")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param("id") id: string, @Request() req: any) {
    return this.lazerService.softDeleteComment(id, req.user.id);
  }
}
