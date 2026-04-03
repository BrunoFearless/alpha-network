import { IsString, IsOptional, MinLength, MaxLength, IsUUID } from 'class-validator';

export class BotPostMessageDto {
  @IsString() @IsUUID('4') channelId: string;

  @IsString() @MinLength(1) @MaxLength(4000)
  content: string;

  @IsOptional() @IsString() @IsUUID('4')
  replyToId?: string | null;
}

export class BotPatchMemberDto {
  @IsString() @IsUUID('4') serverId: string;

  @IsOptional() @IsString() @IsUUID('4')
  communityRoleId?: string | null;
}
