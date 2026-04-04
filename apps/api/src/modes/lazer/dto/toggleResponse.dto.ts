import { IsBoolean, IsNumber } from "class-validator"

export class ToggleResponseDTO {
  @IsBoolean()
  liked: boolean;
  @IsNumber()
  reactionCount: number;
}
