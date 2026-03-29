import {
  Injectable, UnauthorizedException,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface GoogleUserData {
  googleId:    string;
  email:       string;
  displayName: string;
  avatarUrl:   string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Registo ───────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Já existe uma conta com este email.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.createUser({
      email: dto.email,
      passwordHash,
      username: dto.username,
      provider: 'email',
    });

    return this.generateSession(user.id, user.email, user.profile);
  }

  // ── Login ─────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou password incorrectos.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Email ou password incorrectos.');

    return this.generateSession(user.id, user.email, user.profile);
  }

  // ── Google OAuth ──────────────────────────────────────────────────
  async googleLogin(googleUser: GoogleUserData) {
    // 1. Procura utilizador existente pelo email
    let user = await this.users.findByEmail(googleUser.email);

    if (user) {
      // 2a. Utilizador já existe — actualiza avatar se vier do Google
      if (googleUser.avatarUrl && user.profile && !user.profile.avatarUrl) {
        await this.prisma.profile.update({
          where: { userId: user.id },
          data:  { avatarUrl: googleUser.avatarUrl },
        });
        // Recarregar com avatar actualizado
        user = await this.users.findByEmail(googleUser.email);
      }
    } else {
      // 2b. Novo utilizador — criar conta automaticamente
      // Gerar username a partir do displayName, garantir que é único
      const baseUsername = googleUser.displayName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 18);

      const username = await this.generateUniqueUsername(baseUsername);

      user = await this.users.createUser({
        email:       googleUser.email,
        provider:    'google',
        username,
        displayName: googleUser.displayName,
        avatarUrl:   googleUser.avatarUrl ?? undefined,
        // passwordHash fica null — conta Google não tem password
      });
    }

    return this.generateSession(user!.id, user!.email, user!.profile);
  }

  // ── Refresh Token ─────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Sessão expirada.');

    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { include: { profile: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada. Faz login novamente.');
    }

    await this.prisma.session.delete({ where: { id: session.id } });
    return this.generateSession(session.userId, session.user.email, session.user.profile);
  }

  // ── Logout ────────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    if (!refreshToken) return;
    await this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  // ── Dados do utilizador actual ────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException();

    const { passwordHash, emailVerified, deletedAt, ...safeUser } = user;
    return safeUser;
  }

  // ── Helpers privados ──────────────────────────────────────────────
  private async generateSession(userId: string, email: string, profile: any) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email },
        { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: '15m' },
      ),
      this.jwt.signAsync(
        { sub: userId },
        { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: '30d' },
      ),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.session.create({
      data: { userId, refreshToken, expiresAt },
    });

    return { accessToken, refreshToken, user: { id: userId, email, profile } };
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    let candidate = base || 'user';
    let attempt   = 0;

    while (true) {
      const name = attempt === 0 ? candidate : `${candidate}${attempt}`;
      const existing = await this.users.findByUsername(name);
      if (!existing) return name;
      attempt++;
    }
  }
}
