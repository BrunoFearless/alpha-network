import { IsOptional, IsString } from "class-validator"

export class ToggleRequestDTO {
  @IsString()
  postId: string;
}
