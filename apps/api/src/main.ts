import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookies (necessário para o refresh token)
  app.use(cookieParser());

  // Prefixo global das rotas
  app.setGlobalPrefix('api/v1');

  // Validação automática dos DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // ignora campos não declarados no DTO
    forbidNonWhitelisted: false,
    transform: true,       // converte tipos automaticamente
  }));

  // Filtro global de erros — garante formato { success, error } em todos os erros
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS — permite pedidos do frontend Next.js
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,     // necessário para envio de cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`\n🚀 Alpha Network API running on http://localhost:${port}/api/v1`);
}

bootstrap();
