import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { BotPlatformRateLimitService } from './bot-platform-rate-limit.service';

@Injectable()
export class BotPlatformRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: BotPlatformRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ bot?: { id: string } }>();
    const botId = req.bot?.id;
    if (!botId) return true;
    if (!this.limiter.allow(botId)) {
      throw new HttpException('Rate limit da API do bot excedido.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
