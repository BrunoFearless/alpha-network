import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * FASE 5 — anti-abuso: limita avaliações do engine por canal numa janela temporal
 * (evita flood de mensagens a disparar o fluxo sem parar).
 */
@Injectable()
export class BotEngineBudgetService {
  private readonly buckets = new Map<string, { n: number; t: number }>();

  constructor(private readonly config: ConfigService) {}

  allowChannel(channelId: string): boolean {
    const limit = Number(this.config.get('BOT_ENGINE_CHANNEL_BUDGET_PER_WINDOW') ?? 30);
    const windowMs = Number(this.config.get('BOT_ENGINE_CHANNEL_BUDGET_WINDOW_MS') ?? 10_000);
    const now = Date.now();
    const b = this.buckets.get(channelId);
    if (!b || now - b.t > windowMs) {
      this.buckets.set(channelId, { n: 1, t: now });
      return true;
    }
    if (b.n >= limit) return false;
    b.n += 1;
    return true;
  }
}
