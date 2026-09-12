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
    /* 13 MB: the 12 MB upload ceiling plus room for headers. Evidence
       photographs from a phone routinely exceed the old 5 MB limit, and a
       rejected upload at the moment somebody is standing in front of a fixed
       handpump is the worst possible time to lose one. */
    new FastifyAdapter({ trustProxy: true, bodyLimit: 13 * 1024 * 1024 }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.flushLogs();

  const config = app.get(AppConfigService);

  await app.register(helmet, { contentSecurityPolicy: false });

  /**
   * Binary bodies, for the local upload driver.
   *
   * Fastify parses JSON and urlencoded out of the box and rejects everything
   * else with a 415. The local driver receives raw image bytes on a PUT, so
   * these types are passed through untouched — and validated against their
   * magic numbers inside `StorageService`, because a declared content type is
   * a claim rather than a fact.
   */
  const instance = app.getHttpAdapter().getInstance();
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']) {
    instance.addContentTypeParser(type, { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });
  }

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
