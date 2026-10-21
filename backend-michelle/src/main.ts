import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { frontendUrl, jwtSecret } from './common/config';

async function bootstrap() {
  // Falla al arrancar (y no en el primer login) si falta configuración de producción
  jwtSecret();

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: frontendUrl().split(',').map((origin) => origin.trim()),
    exposedHeaders: ['Content-Disposition'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Michelle Nutrición API')
    .setDescription('API REST para agenda y consultas nutricionales')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(Number(process.env.PORT ?? 3000));
}
void bootstrap();
