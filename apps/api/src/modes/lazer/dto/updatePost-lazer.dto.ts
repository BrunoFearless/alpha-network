import { PartialType } from "@nestjs/mapped-types";
import { CreatePostLazerDto } from "./createPost-lazer.dto";

export class UpdatePostLazerDto extends PartialType(CreatePostLazerDto) {}
