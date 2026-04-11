import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  bannerColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nameFont?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  nameEffect?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  nameColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  auroraTheme?: string;
}
