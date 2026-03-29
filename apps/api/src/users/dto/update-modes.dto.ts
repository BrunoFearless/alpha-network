import { IsArray, IsString, IsIn } from 'class-validator';

const VALID_MODES = ['lazer', 'creator', 'developer', 'community', 'bots'];

export class UpdateModesDto {
  @IsArray()
  @IsString({ each: true })
  @IsIn(VALID_MODES, { each: true, message: `Modo inválido. Válidos: ${VALID_MODES.join(', ')}` })
  modes: string[];
}
