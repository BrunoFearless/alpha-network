import { IsString, IsOptional, MaxLength, MinLength, IsBoolean, IsHexColor } from 'class-validator';

export class CreateLazerCommunityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  iconEmoji?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateLazerCommunityDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(50) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() @IsString() iconUrl?: string;
  @IsOptional() @IsString() iconEmoji?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class CreateLazerCommunityRuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  text: string;
}
