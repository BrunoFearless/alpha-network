import { IsString, IsOptional, MinLength, MaxLength, IsBoolean, IsUUID, IsInt, Min, Max, ValidateIf } from 'class-validator';

export class CreateServerDto {
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres.' })
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class CreateChannelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  name: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  position?: number;
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

export class ToggleReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji: string;
}

export class UpdateServerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class CreateCommunityRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string;

  @IsOptional()
  @IsBoolean()
  canModerate?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageServer?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageChannels?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  position?: number;
}

export class UpdateCommunityRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  canModerate?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageServer?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageChannels?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class AssignMemberRoleDto {
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  communityRoleId?: string | null;
}

export class UpdateServerBotDto {
  @IsBoolean()
  isAdminBot: boolean;
}
