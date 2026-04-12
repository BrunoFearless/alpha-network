import {
  Controller, Get, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateModesDto } from './dto/update-modes.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

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
    console.log(safeUser)
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
  // TODO (Adolfo v2): implementar PATCH /users/me com bio, displayName, avatarUrl
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserDto,
  ) {
    const updatedProfile = await this.usersService.updateProfile(user.id, dto)
    return {
      success: true,
      data: updatedProfile
    }
  }

  // ── Apagar conta ───────────────────────────────────────────────────
  // TODO (Adolfo v2): soft delete com deletedAt
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: { id: string }) {
    // Placeholder — Adolfo implementa em v2
    await this.usersService.softDelete(user.id)
    return
  }
}
