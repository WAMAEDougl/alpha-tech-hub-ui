import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  // Only the storefront/admin origin(s) may call the API from a browser.
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:5173')
    .split(',').map(o => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // Serve uploaded files statically
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  // Swagger (dev only: it documents every admin endpoint)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Alpha Computers Nanyuki API')
      .setDescription('Backend API for Alpha Computers Nanyuki e-commerce and service platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Alpha Computers API running on http://localhost:${port}`);
  if (process.env.NODE_ENV !== "production") console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
