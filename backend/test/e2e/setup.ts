/**
 * e2e prerequisites.
 *
 * These tests need a real, disposable Postgres. Point DATABASE_URL / DIRECT_URL
 * at a local container (`docker compose up -d` in backend/) or a throwaway Neon
 * branch before running `npm run test:e2e`. Schema is applied once here.
 */
import { execSync } from 'node:child_process';
import { beforeAll } from 'vitest';

beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'e2e tests require DATABASE_URL (a disposable database). ' +
        'See backend/README.md → "Running the tests".',
    );
  }
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';
  process.env.OTP_DEV_ECHO = 'true';
  process.env.DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'e2e-access-secret'.padEnd(40, '0');
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'e2e-refresh-secret'.padEnd(40, '0');

  // `migrate deploy` is idempotent; on a fresh database it creates the schema.
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}, 120_000);
