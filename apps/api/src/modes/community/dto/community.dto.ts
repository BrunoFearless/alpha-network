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

  @IsOptional()
  @IsString()
  @MaxLength(2)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}

export class SetChannelPermissionsDto {
  @IsBoolean()
  isPrivate: boolean;

  @IsOptional()
  allowedRoles?: string[] | null; // Array of roleIds
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

  @IsOptional()
  @IsString()
  @MaxLength(2)
  icon?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  icon?: string;

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

  @IsOptional()
  embedJson?: any;
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

export class CreateCommunityEventDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsString()
  locationType: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  frequency?: string;
}

export class UpdateCommunityEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  locationType?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  frequency?: string;
}
