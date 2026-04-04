import { IsString, IsOptional, MinLength, MaxLength, Matches, IsIn, IsObject, ValidateIf, IsBoolean } from 'class-validator';

export class CreateBotDto {
  @IsString() @MinLength(2) @MaxLength(32) name: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsString() @MaxLength(5) prefix?: string;
}

export class AddCommandDto {
  @IsString() @MinLength(1) @MaxLength(32)
  @Matches(/^[a-z0-9_-]+$/, { message: 'Só minúsculas, números, _ e -.' })
  trigger: string;

  @IsString() @MinLength(1) @MaxLength(2000)
  response: string;

  @IsOptional()
  @IsIn(['text', 'image', 'embed'])
  responseType?: 'text' | 'image' | 'embed';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsObject()
  embedJson?: Record<string, unknown>;
}

export class UpdateBotDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(32) name?: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string | null;
  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor hex inválida (ex: #C9A84C)' }) customColor?: string;
  @IsOptional() @IsString() @MaxLength(5) prefix?: string;
  /** Fluxo do builder (`{ version: 1, nodes: [...] }`) ou null para limpar. */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsObject()
  builderFlow?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
