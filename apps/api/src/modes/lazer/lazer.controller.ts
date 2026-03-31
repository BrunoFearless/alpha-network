import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { LazerService } from "./lazer.service";
import { CreateLazerDto } from "./dto/create-lazer.dto";
import { UpdateLazerDto } from "./dto/update-lazer.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@Controller("lazer/")
export class LazerController {
  constructor(private readonly lazerService: LazerService) {}

  @Post("/posts")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createPost(
    @Body()
    createLazerDto: CreateLazerDto,
    @Request() req: any,
  ) {
    return this.lazerService.createPost(createLazerDto, req.user.id);
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
  updatePost(@Param("id") id: string, @Body() updateLazerDto: UpdateLazerDto) {
    return this.lazerService.updatePost(id, updateLazerDto);
  }

  @Delete("posts/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removePost(@Param("id") id: string) {
    return this.lazerService.removePost(id);
  }
}
