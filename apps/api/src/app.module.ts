import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LazerModule } from './modes/lazer/lazer.module';
import { CreatorModule } from './modes/creator/creator.module';
import { DeveloperModule } from './modes/developer/developer.module';
import { CommunityModule } from './modes/community/community.module';
import { BotsModule } from './modes/bots/bots.module';
import { BotPlatformModule } from './modes/bot-platform/bot-platform.module';
import { FriendsModule } from './users/friends.module';
import { AlphaCoreModule } from './modes/alpha-core/alpha-core.module';

@Module({
  imports: [
    // Variáveis de ambiente disponíveis em toda a aplicação
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — máximo 100 pedidos por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Prisma global — disponível em todos os módulos sem importar individualmente
    PrismaModule,

    // Módulos da aplicação
    AuthModule,
    UsersModule,
    LazerModule,
    CreatorModule,
    DeveloperModule,
    CommunityModule,
    BotsModule,
    BotPlatformModule,
    FriendsModule,
    AlphaCoreModule,
  ],
})
export class AppModule {}
