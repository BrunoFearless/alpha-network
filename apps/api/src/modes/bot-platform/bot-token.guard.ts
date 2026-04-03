import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BotTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers?: { authorization?: string }; bot?: { id: string } }>();
    const raw = req.headers?.authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!raw) throw new UnauthorizedException('Token do bot em falta.');
    const bot = await this.prisma.bot.findUnique({ where: { token: raw }, select: { id: true } });
    if (!bot) throw new UnauthorizedException('Token do bot inválido.');
    req.bot = bot;
    return true;
  }
}
