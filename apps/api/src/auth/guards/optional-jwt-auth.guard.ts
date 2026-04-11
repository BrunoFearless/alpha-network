import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard - protege rotas publico/privadas 
 * Uso: @UseGuards(OptionalJwtAuthGuard)
 * Após aplicado, o token se torna opcional para a requisição
 * se houver token ele autentica
 * se não houver, ele retorna null
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // O handleRequest permite-nos controlar o que acontece após a tentativa de validar o token
    handleRequest(err, user, info) {
        // Se houver um erro ou o utilizador não existir, retornamos null em vez de lançar 401.
        // Assim, o código continua e o req.user fica simplesmente vazio.
        if (err || !user) {
            return null;
        }
        return user;
    }
}