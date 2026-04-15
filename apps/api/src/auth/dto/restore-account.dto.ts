import { IsEmail, IsString, IsOptional, IsUUID } from "class-validator";
import { LoginDto } from "./login.dto";

export class RestoreAccountDto {
    @IsOptional()
    @IsEmail()
    email: string;

    @IsOptional()
    @IsUUID()
    id: string

    @IsString()
    @IsOptional()
    password: string;
}