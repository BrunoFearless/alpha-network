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
}
