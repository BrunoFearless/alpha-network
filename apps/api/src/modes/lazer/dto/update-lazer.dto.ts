import { PartialType } from '@nestjs/mapped-types';
import { CreateLazerDto } from './create-lazer.dto';

export class UpdateLazerDto extends PartialType(CreateLazerDto) {}
