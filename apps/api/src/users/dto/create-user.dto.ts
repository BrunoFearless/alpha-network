import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, isNotEmpty } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsStrongPassword()
    passwordHash?: string;

    provider?: string;

    username: string;
    displayName?: string;
    avatarUrl?: string;
}
