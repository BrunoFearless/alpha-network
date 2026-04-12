import {
  Controller, Get, Patch, Delete, Post,
  Body, Param, UseGuards, HttpCode, HttpStatus,
  UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateModesDto } from './dto/update-modes.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ── Perfil público ─────────────────────────────────────────────────
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

  // ── Editar perfil (campos de texto) ────────────────────────────────
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return { success: true, data: updated };
  }

  // ── Upload de avatar ───────────────────────────────────────────────
  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
      const allowed = [
        'image/jpeg', 'image/png', 'image/gif',
        'image/webp', 'video/mp4', 'video/webm',
      ];
      if (!allowed.includes(file.mimetype)) {
        return cb(
          new BadRequestException('Formato não suportado. Usa JPG, PNG, GIF, WebP, MP4 ou WebM.'),
          false,
        );
      }
      cb(null, true);
    },
  }))
  async uploadAvatar(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro em falta.');
    const url = await this.usersService.saveUserUpload(user.id, 'avatar', file);
    const updated = await this.usersService.updateProfile(user.id, { avatarUrl: url });
    return { success: true, data: updated };
  }

  // ── Upload de banner ───────────────────────────────────────────────
  @Post('me/banner')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
      const allowed = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
      ];
      if (!allowed.includes(file.mimetype)) {
        return cb(new BadRequestException('Formato não suportado.'), false);
      }
      cb(null, true);
    },
  }))
  async uploadBanner(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Ficheiro em falta.');
    const url = await this.usersService.saveUserUpload(user.id, 'banner', file);
    const updated = await this.usersService.updateProfile(user.id, { bannerUrl: url });
    return { success: true, data: updated };
  }

  // ── Activar/desactivar modos ───────────────────────────────────────
  @Patch('me/modes')
  @UseGuards(JwtAuthGuard)
  async updateModes(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateModesDto,
  ) {
    const updated = await this.usersService.updateActiveModes(user.id, dto.modes);
    return { success: true, data: updated };
  }

  // ── Apagar conta ───────────────────────────────────────────────────
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: { id: string }) {
    await this.usersService.softDeleteUser(user.id);
  }
}