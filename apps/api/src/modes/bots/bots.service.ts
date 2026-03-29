import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// TODO (Bruno Fearless): implementar os métodos — ver guia v2-guia-bruno-fearless.docx
@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Verifica se algum bot activo no servidor deve responder à mensagem */
  async checkBotTriggers(channelId: string, content: string) {
    // TODO (Bruno): implementar — ver guia Dia 7
    return null;
  }
}
