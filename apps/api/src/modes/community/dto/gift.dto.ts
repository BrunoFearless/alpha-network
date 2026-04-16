import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength } from 'class-validator';

export class SendGiftDto {
  @IsUUID()
  receiverId: string;

  @IsString()
  type: string; // "STICKER" | "BADGE" | "NITRO"

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @IsBoolean()
  isPrivate: boolean;
}
