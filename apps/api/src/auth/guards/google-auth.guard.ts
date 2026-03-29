import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GoogleAuthGuard — usado nos dois endpoints do fluxo OAuth:
 *   GET /auth/google          → inicia o redirect para o Google
 *   GET /auth/google/callback → recebe o callback do Google
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
