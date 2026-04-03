import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** FASE 5 — rate limit in-memory por token de bot (API HTTP platform/bot). */
@Injectable()
export class BotPlatformRateLimitService {
  private readonly buckets = new Map<string, { n: number; t: number }>();

  constructor(private readonly config: ConfigService) {}

  /** @returns true se o pedido pode continuar */
  allow(botId: string): boolean {
    const limit = Number(this.config.get('BOT_PLATFORM_HTTP_RPM') ?? 120);
    const windowMs = 60_000;
    const key = botId;
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || now - b.t > windowMs) {
      this.buckets.set(key, { n: 1, t: now });
      return true;
    }
    if (b.n >= limit) return false;
    b.n += 1;
    return true;
  }
}
