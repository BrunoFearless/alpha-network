import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser — extrai o utilizador autenticado do pedido.
 * Uso: @CurrentUser() user: { id: string; email: string }
 * Requer @UseGuards(JwtAuthGuard) na rota.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
