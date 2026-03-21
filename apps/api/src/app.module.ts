import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LazerModule } from './modes/lazer/lazer.module';
import { CreatorModule } from './modes/creator/creator.module';
import { DeveloperModule } from './modes/developer/developer.module';
import { CommunityModule } from './modes/community/community.module';
import { BotsModule } from './modes/bots/bots.module';

@Module({
  imports: [
    // Variáveis de ambiente disponíveis em toda a aplicação
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — máximo 100 pedidos por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Módulos da aplicação
    AuthModule,
    UsersModule,
    LazerModule,
    CreatorModule,
    DeveloperModule,
    CommunityModule,
    BotsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
