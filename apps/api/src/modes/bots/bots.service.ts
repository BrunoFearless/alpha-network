import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

// TODO: implementar os métodos deste serviço
// Guia: v2-guia-bruno-fearless.docx

@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Verifica se algum bot activo no servidor deve responder à mensagem */
  async checkBotTriggers(channelId: string, content: string) {
    // TODO: implementar — ver guia do Bruno, Dia 7
    return null;
  }
}
