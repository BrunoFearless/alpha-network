import { IsOptional, IsString } from "class-validator";

export class CreatePostLazerDto {
  @IsString()
  content: string;
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
