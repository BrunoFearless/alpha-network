import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  
  // Setup uploads directories with full diagnostics
  const uploadsPath = join(process.cwd(), 'uploads');
  const uploadSubdirs = [
    'bots',
    'chat',
    'art',
    'art-collections',
    'music',
    'videos',
    'thumbnails',
    'users',
    'community',
    'avatars',
  ];
  
  console.log(`\n📁 Setup de Uploads:`);
  console.log(`   Working Dir: ${process.cwd()}`);
  console.log(`   Uploads Dir: ${uploadsPath}`);
  
  try {
    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
      console.log(`   ✓ Created ${uploadsPath}`);
    }
    for (const sub of uploadSubdirs) {
      const subPath = join(uploadsPath, sub);
      if (!existsSync(subPath)) {
        mkdirSync(subPath, { recursive: true });
        console.log(`   ✓ Created ${subPath}`);
      }
    }
  } catch (e) {
    console.error(`   ✗ Error creating uploads dirs:`, e.message);
  }
  
  // Configure static file serving with CORS headers
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  });
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
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`\n✦ A Alpha Network API está rodando: http://localhost:${port}/api/v1`);
  console.log(`✦ Frontend Web disponível em: http://localhost:3000/auth/login\n`);
}

bootstrap();
