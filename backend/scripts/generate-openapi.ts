/**
 * Writes the OpenAPI document to `backend/openapi.json`.
 *
 * Committed and regenerated in CI; a drift check fails the build if a route
 * changed without the spec being updated. The Flutter client is generated from
 * this file (`openapi-generator` dio flavour) — see the plan, §9/§11.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from '../src/app.module';

async function run(): Promise<void> {
  process.env.LOG_LEVEL = 'silent';
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
  });
  app.setGlobalPrefix('api', { exclude: ['healthz', 'readyz'] });
  app.enableVersioning();
  await app.init();

  const config = new DocumentBuilder()
    .setTitle('Jan Setu API')
    .setDescription('Generated — do not edit by hand. Run `npm run openapi:gen`.')
    .setVersion('1')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  const out = resolve(process.cwd(), 'openapi.json');
  writeFileSync(out, JSON.stringify(document, null, 2) + '\n');
  await app.close();

  process.stdout.write(`Wrote ${out} (${Object.keys(document.paths).length} paths)\n`);
}

run().then(
  () => process.exit(0),
  (error: unknown) => {
    process.stderr.write(
      `openapi:gen failed\n${String(error instanceof Error ? error.stack : error)}\n`,
    );
    process.exit(1);
  },
);
