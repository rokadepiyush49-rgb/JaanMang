/**
 * Database seed.
 *
 * Reproduces the fixture data apps/web renders today, so every `/gov` screen
 * shows the same numbers against the real database as it did against the mock
 * store. Safe to re-run: it wipes and rebuilds. Refuses to run against a
 * staging or production database.
 *
 *   npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { seedRbac } from './seed/rbac';
import { seedGov } from './seed/gov';
import { seedOnboarding } from './seed/onboarding';
import { seedInstitute } from './seed/institute';

const prisma = new PrismaClient();

async function wipe(): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
  `;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    throw new Error(`Refusing to seed a ${process.env.NODE_ENV} database.`);
  }

  const started = Date.now();
  await wipe();
  await seedRbac(prisma);
  const { devLogins } = await seedGov(prisma);
  const { devLogins: identityLogins } = await seedOnboarding(prisma);
  const { devLogins: instituteLogins } = await seedInstitute(prisma);

  const counts = {
    users: await prisma.user.count(),
    jurisdictions: await prisma.jurisdiction.count(),
    villages: await prisma.village.count(),
    problems: await prisma.problem.count(),
    reports: await prisma.citizenReport.count(),
    auditEntries: await prisma.auditEntry.count(),
  };

  process.stdout.write(
    `\nSeed complete in ${Date.now() - started}ms\n` +
      Object.entries(counts)
        .map(([k, v]) => `  ${v.toString().padStart(4)}  ${k}`)
        .join('\n') +
      `\n\nDemo logins — every account uses the password  jansetu-dev\n\n` +
      identityLogins.concat(instituteLogins).map((l) => `  ${l}`).join('\n') +
      '\n' +
      devLogins.map((l) => `  ${l}`).join('\n') +
      '\n',
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
