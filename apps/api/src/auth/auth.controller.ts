import {
  Controller, Post, Get, Body, Req, Res,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Registo ────────────────────────────────────────────────────────
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { success: true, data: { accessToken: result.accessToken, user: result.user } };
  }

  // ── Login ──────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { success: true, data: { accessToken: result.accessToken, user: result.user } };
  }

  // ── Google OAuth — Passo 1: iniciar redirect ───────────────────────
  // O guard redireciona automaticamente para accounts.google.com
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Este método nunca executa — o GoogleAuthGuard faz o redirect antes
  }

  // ── Google OAuth — Passo 2: callback do Google ─────────────────────
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // req.user é preenchido pela GoogleStrategy após autenticação
    const googleUser = req.user as any;

    try {
      const result = await this.authService.googleLogin(googleUser);

      // Guarda o refreshToken em cookie HTTP-only (mesmo fluxo do login normal)
      this.setRefreshCookie(res, result.refreshToken);

      // Redireciona para o frontend com o accessToken na query string
      // O frontend lê o token, guarda no store e vai para /main
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
    } catch (err) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?error=google_failed`);
    }
  }

  // ── Refresh Token ──────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refreshToken;
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    return { success: true, data: { accessToken: result.accessToken } };
  }

  // ── Logout ─────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refreshToken;
    await this.authService.logout(token);
    res.clearCookie('refreshToken');
    return { success: true };
  }

  // ── Utilizador actual ──────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { id: string; email: string }) {
    const profile = await this.authService.getMe(user.id);
    return { success: true, data: profile };
  }

  // ── Helper ─────────────────────────────────────────────────────────
  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   30 * 24 * 60 * 60 * 1000, // 30 dias
    });
  }
}
