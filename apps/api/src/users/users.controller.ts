import {
  Controller, Get, Patch, Delete, Post,
  Body, Param, UseGuards, HttpCode, HttpStatus, Req, UseInterceptors, BadRequestException, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateModesDto } from './dto/update-modes.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { OptionalJwtAuthGuard } from '@auth/guards/optional-jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }


  // ── Busca Perfil público por id ─────────────────────────────────────────────────
  @Get('id/:id')
  async getProfileById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user || !user.profile) {
      return { success: false, error: { message: 'Utilizador não encontrado.' } };
    }
    const { passwordHash, deletedAt, emailVerified, ...safeUser } = user as any;
    return { success: true, data: { ...user.profile, id: user.id, user: safeUser } };
  }

  // ── Perfil público ─────────────────────────────────────────────────
  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  async getProfile(
    @Param('username') username: string,
    @Req() req: any
  ) {
    const requesterId = req.user?.id;

    const profile = await this.usersService.getFullProfile(username, requesterId);

    if (!profile) {
      return { success: false, error: { message: 'Utilizador não encontrado.' } };
    }

    return {
      success: true, data: { profile }
    };
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

  // ── Upload de avatar ──────────────────────────────────────────────
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
    await this.usersService.softDeleteUser(user.id)
    return
  }

  // ── Seguir ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post(':username/follow')
  async follow(
    @Param('username') username: string,
    @Req() req: any
  ) {
    const requesterId = req.user.id
    await this.usersService.follow(requesterId, username)
    return {
      success: true,
      message: `Agora segues ${username}`
    }
  }

  // ── Parar de seguir ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Delete(':username/follow')
  async unfollow(
    @Param('username') username: string,
    @Req() req: any
  ) {
    const requesterId = req?.user.id
    await this.usersService.unfollow(requesterId, username)
    return {
      success: true,
      message: `Deixaste de seguir ${username}`
    }
  }

  // ── Lista de seguidores ───────────────────────────────────────────────────
  @Get(':username/followers')
  async followers(@Param('username') username: string) {
    const followers = await this.usersService.getFollowers(username);
    return { success: true, data: followers }

  }

  // ── Lista de seguindos ───────────────────────────────────────────────────
  @Get(':username/followings')
  async followings(@Param('username') username: string) {
    const followings = await this.usersService.getFollowings(username)
    return { success: true, data: followings }
  }
}