import {
  Injectable, UnauthorizedException,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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

    // Rotação do refresh token — invalida o antigo e cria um novo
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

    // Remover campos sensíveis antes de devolver
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

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, profile },
    };
  }
}