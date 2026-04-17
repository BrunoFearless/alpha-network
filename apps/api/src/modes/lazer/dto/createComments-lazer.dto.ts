import { IsOptional, IsString } from "class-validator";

export class CreateCommentsLazerDto {
  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
