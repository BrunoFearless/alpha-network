import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard — protege rotas que requerem autenticação.
 * Uso: @UseGuards(JwtAuthGuard) em qualquer controller.
 * Após aplicado, req.user fica disponível com: { id, email }
 *
 * Importar de: import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
 * Ou via barrel: import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard'
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}