import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './security/auth.service';
import { AuthModule } from './security/auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const authService = app.select(AuthModule).get(AuthService);
  await authService.seedUser();

  await app.listen(3000);
}
bootstrap();