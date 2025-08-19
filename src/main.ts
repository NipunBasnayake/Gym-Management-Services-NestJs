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

  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3500);

  const authService = app.select(AuthModule).get(AuthService);
  await authService.seedUser();
  logger.log('Predefined user seeded');

  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}
bootstrap();