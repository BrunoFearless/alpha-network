import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Setup uploads directory with full diagnostics
  const uploadsPath = join(process.cwd(), 'uploads');
  const botsPath = join(uploadsPath, 'bots');
  
  console.log(`\n📁 Setup de Uploads:`);
  console.log(`   Working Dir: ${process.cwd()}`);
  console.log(`   Uploads Dir: ${uploadsPath}`);
  console.log(`   Bots Dir: ${botsPath}`);
  
  // Create base uploads directory
  try {
    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
      console.log(`   ✓ Created ${uploadsPath}`);
    } else {
      console.log(`   ✓ Uploads directory exists`);
    }
  } catch (e) {
    console.error(`   ✗ Error creating uploads dir:`, e.message);
  }

  // Create bots subdirectory
  try {
    if (!existsSync(botsPath)) {
      mkdirSync(botsPath, { recursive: true });
      console.log(`   ✓ Created ${botsPath}`);
    } else {
      console.log(`   ✓ Bots directory exists`);
    }
  } catch (e) {
    console.error(`   ✗ Error creating bots dir:`, e.message);
  }
  
  // Configure static file serving
  app.useStaticAssets(uploadsPath, { prefix: '/uploads' });
  console.log(`📱 Static files serving:`);
  console.log(`   URL Prefix: /uploads`);
  console.log(`   Physical Path: ${uploadsPath}\n`);

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`\n🚀 Alpha Network API running on http://localhost:${port}/api/v1`);
}

bootstrap();
