import { IsOptional, IsString, IsBoolean } from "class-validator";

export class CreatePostLazerDto {
  @IsString()
  content: string;
  @IsString()
  @IsOptional()
  imageUrl?: string;
  @IsString({ each: true })
  @IsOptional()
  tropeNames?: string[];
  @IsBoolean()
  @IsOptional()
  isSparkle?: boolean;
  @IsString()
  @IsOptional()
  titleFont?: string;
  @IsString()
  @IsOptional()
  titleColor?: string;

  @IsString()
  @IsOptional()
  communityId?: string;
}
