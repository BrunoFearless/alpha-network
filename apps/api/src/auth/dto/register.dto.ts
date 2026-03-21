import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Introduz um email válido.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'A password deve ter pelo menos 8 caracteres.' })
  password: string;

  @IsString()
  @MinLength(3, { message: 'O username deve ter pelo menos 3 caracteres.' })
  @MaxLength(20, { message: 'O username não pode ter mais de 20 caracteres.' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'O username só pode conter letras, números e _.' })
  username: string;
}
