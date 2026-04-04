import { IsOptional, IsString } from "class-validator";

export class CreateCommentsLazerDto {

  @IsString()
  content: string;
 
}
