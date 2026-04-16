import {
  Controller, Get, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus, Req, Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateModesDto } from './dto/update-modes.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { OptionalJwtAuthGuard } from '@auth/guards/optional-jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ── Perfil público ─────────────────────────────────────────────────
  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  async getProfile(
    @Param('username') username: string,
    @Req() req: any
  ) {
    const requesterId = req.user?.id;

    const result = await this.usersService.getFullProfile(username, requesterId);

    if (!result) {
      return { success: false, error: { message: 'Utilizador não encontrado.' } };
    }

    return { success: true, data: result };
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

  // ── Editar perfil ──────────────────────────────────────────────────
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
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: { id: string }) {
    await this.usersService.softDelete(user.id)
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
