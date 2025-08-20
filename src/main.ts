import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './security/auth.service';
import { AuthModule } from './security/auth.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const allowedOrigins = [
    'https://d6ac7ff6fb7a.ngrok-free.app', // Current frontend ngrok URL
    'http://localhost:3000', // Local development
  ];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    optionsSuccessStatus: 204,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3500);

  const authService = app.select(AuthModule).get(AuthService);
  await authService.seedUser();
  logger.log('Predefined user seeded');

  await app.listen(port);
  logger.log(`Application is running on port ${port}`);

  app.use((req, res, next) => {
    logger.log(`Incoming request: ${req.method} ${req.url}, Origin: ${req.headers.origin}`);
    next();
  });
}
bootstrap();