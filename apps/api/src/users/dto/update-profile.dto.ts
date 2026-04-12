import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(32)
  displayName?: string;

  @IsOptional() @IsString() @MaxLength(200)
  bio?: string;

  @IsOptional() @IsString() @MaxLength(500)
  avatarUrl?: string;

  @IsOptional() @IsString() @MaxLength(500)
  bannerUrl?: string;

  @IsOptional() @IsString() @MaxLength(20)
  bannerColor?: string;

  @IsOptional() @IsString() @MaxLength(100)
  status?: string;

  @IsOptional() @IsString() @MaxLength(200)
  tags?: string;

  @IsOptional() @IsString() @MaxLength(50)
  nameFont?: string;

  @IsOptional() @IsString() @MaxLength(30)
  nameEffect?: string;

  @IsOptional() @IsString() @MaxLength(20)
  nameColor?: string;

  @IsOptional() @IsString() @MaxLength(30)
  auroraTheme?: string;
}