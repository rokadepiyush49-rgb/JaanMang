# Jan Setu — backend

One centralized REST API for the whole platform. Both clients call it:

- **`apps/web`** — the Next.js student / government / industry app
- **`apps/citizen-app`** — the Flutter citizen app

There is **one** backend. It is not duplicated per client.

## Stack

NestJS 11 (Fastify) · TypeScript · PostgreSQL 16 (Neon) · Prisma 6 · JWT auth
(argon2id) · CASL for RBAC · zod validation · OpenAPI 3 · Vitest. See
[`DESIGN.md`](../DESIGN.md) for the product model the schema mirrors.

## Layout

```
src/
  config/     zod-validated environment → typed AppConfigService
  common/     problem+json errors · cursor pagination · pino logging · shared decorators
  prisma/     the one PrismaClient
  health/     /healthz · /readyz
  auth/       (stage 2) OTP · email login · refresh rotation · /me
  rbac/       (stage 3) permissions · jurisdiction-subtree scoping guards
  problems/   (stage 4) the government problem lifecycle + priority engine
  ...         further modules land per the roadmap
prisma/
  schema.prisma   the database schema
  seed.ts         reproduces the apps/web fixtures so screens render real data day one
test/
  unit/       pure logic, no database
  e2e/        full app over HTTP against a disposable Postgres
```

## Local development

```bash
cp .env.example .env                 # defaults point at the local docker db
docker compose up -d                 # Postgres 16 on :5432   (or use a Neon dev branch)
npm install
npm run prisma:migrate               # create/apply the schema
npm run db:seed                      # load the fixture data
npm run start:dev                    # http://localhost:4000  ·  docs at /api/docs
```

Without Docker, create a free Postgres at [neon.tech](https://neon.tech) (no
card), put its pooled URL in `DATABASE_URL` and its direct URL in `DIRECT_URL`.

## Running the tests

```bash
npm test            # unit — no database needed
npm run test:e2e    # e2e — needs DATABASE_URL pointing at a DISPOSABLE database
```

The e2e suite runs `prisma migrate deploy` against `DATABASE_URL` and truncates
between specs, so never point it at a database you care about. A local
`docker compose` database or a dedicated Neon branch is the intended target.

## Environments

| Env | API host | Database |
| --- | --- | --- |
| development | local | local Docker / Neon dev branch |
| staging | Railway (staging service) | Neon `staging` branch |
| production | Railway (prod service) | Neon `production` branch |

Migrations run in CI on deploy (`prisma migrate deploy`), never from app boot in
a way that could race multiple instances — the Dockerfile's `CMD` runs it once
before `node dist/main.js`.

## The API contract

`openapi.json` is committed and regenerated with `npm run openapi:gen`. CI fails
if it drifts from the code. The Flutter client is generated from it.
