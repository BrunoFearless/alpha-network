import {
  Controller, Get, Patch, Delete, Post,
  Body, Param, UseGuards, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateModesDto } from './dto/update-modes.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Perfil público ─────────────────────────────────────────────────
  // TODO (Adolfo v2): implementar getProfile completo com followersCount
  @Get(':username')
  async getProfile(@Param('username') username: string) {
    const profile = await this.usersService.findByUsername(username);
    if (!profile) {
      return { success: false, error: { message: 'Utilizador não encontrado.' } };
    }
    const { user } = profile;
    const { passwordHash, deletedAt, emailVerified, ...safeUser } = user as any;
    return { success: true, data: { ...profile, user: safeUser } };
  }

  // ── Activar/desactivar modos ───────────────────────────────────────
  // Usado pelo main/page.tsx — PATCH /api/v1/users/me/modes
  @Patch('me/modes')
  @UseGuards(JwtAuthGuard)
  async updateModes(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateModesDto,
  ) {
    const updated = await this.usersService.updateActiveModes(user.id, dto.modes);
    return { success: true, data: updated };
  }

  // ── Editar perfil ──────────────────────────────────────────────────
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return { success: true, data: updated };
  }

  // ── Upload de foto de perfil ────────────────────────────────────────
  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { success: true, data: await this.usersService.saveProfileAvatar(user.id, file) };
  }

  // ── Apagar conta ───────────────────────────────────────────────────
  // TODO (Adolfo v2): soft delete com deletedAt
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: { id: string }) {
    // Placeholder — Adolfo implementa em v2
    return;
  }
}
