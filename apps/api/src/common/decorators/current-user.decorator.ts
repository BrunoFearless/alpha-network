import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser — extrai o utilizador autenticado do pedido.
 * Uso: @CurrentUser() user: { id: string; email: string }
 * Requer @UseGuards(JwtAuthGuard) na rota.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
