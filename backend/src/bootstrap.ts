import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { ProblemExceptionFilter } from './common/errors/problem-exception.filter';

/**
 * Builds the application without listening — shared by `main.ts` and the e2e
 * suite so both exercise the exact same middleware, pipes, filters and docs.
 *
 * The `ZodValidationPipe` is registered as `APP_PIPE` in `AppModule` (so it
 * participates in DI); this function adds the HTTP-layer concerns: security
 * headers, CORS, versioned prefix, the problem+json filter and the docs.
 */
export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 5 * 1024 * 1024 }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.flushLogs();

  const config = app.get(AppConfigService);

  await app.register(helmet, { contentSecurityPolicy: false });

  app.enableCors({
    origin: config.corsOrigins.length ? config.corsOrigins : false,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
  });

  app.setGlobalPrefix('api', { exclude: ['healthz', 'readyz'] });
  app.enableVersioning();

  app.useGlobalFilters(new ProblemExceptionFilter());
  app.enableShutdownHooks();

  configureOpenApi(app, config);

  return app;
}

function configureOpenApi(app: INestApplication, config: AppConfigService): void {
  const doc = new DocumentBuilder()
    .setTitle('Jan Setu API')
    .setDescription(
      'One centralized API for the Jan Setu / JanMaang platform — consumed by ' +
        'the Next.js web app (student · government · industry) and the Flutter ' +
        'citizen app. Errors are RFC 9457 application/problem+json.',
    )
    .setVersion('1')
    .addServer(config.publicApiUrl)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, doc));
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs/openapi.json',
    swaggerOptions: { persistAuthorization: true },
  });
}
