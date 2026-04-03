import { IsOptional, IsString } from "class-validator"

export class CreateLazerDto {
  @IsString()
  content: string;
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
