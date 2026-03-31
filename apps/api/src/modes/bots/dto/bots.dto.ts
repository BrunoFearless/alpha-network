import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateBotDto {
  @IsString() @MinLength(2) @MaxLength(32) name: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsString() @MaxLength(5) prefix?: string;
}

export class AddCommandDto {
  @IsString() @MinLength(1) @MaxLength(32)
  @Matches(/^[a-z0-9_-]+$/, { message: 'Só minúsculas, números, _ e -.' })
  trigger: string;
  @IsString() @MinLength(1) @MaxLength(500) response: string;
}
