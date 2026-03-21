import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protege rotas que requerem autenticação.
 * Uso: @UseGuards(JwtAuthGuard) em qualquer controller.
 * Após aplicado, req.user fica disponível com: { id, email }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
