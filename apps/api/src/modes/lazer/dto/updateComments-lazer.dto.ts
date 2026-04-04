import { PartialType } from "@nestjs/mapped-types";
import { CreateCommentsLazerDto } from "./createComments-lazer.dto";

export class UpdateCommentsLazerDto extends PartialType(CreateCommentsLazerDto) {}
