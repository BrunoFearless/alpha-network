import { IsOptional, IsString, IsUrl, Length } from "class-validator";

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @Length(3, 50)
    displayName?: string

    @IsOptional()
    @IsUrl()
    avatarUrl?: string

    @IsOptional()
    @IsString()
    bio?: string
}