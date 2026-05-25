import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AuditService } from './modules/audit/audit.service';
import { AuditInterceptor } from './interceptor/audit.interceptor';
import { AuditContextService } from './modules/audit/services/audit-context.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const auditService = app.get(AuditService);
  const auditContextService = app.get(AuditContextService);
  app.useGlobalInterceptors(
    new AuditInterceptor(auditService, auditContextService),
  );

  const config = new DocumentBuilder()
    .setTitle('PureFlow API')
    .setDescription('PureFlow Mini API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Authentication endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 8080;
  await app.listen(port);
  console.log(`API running :: http://localhost:${port}/api/v1`);
  console.log(`Swagger docs ::  http://localhost:${port}/api/docs`);
}
bootstrap();
