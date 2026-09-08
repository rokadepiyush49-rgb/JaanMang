import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as argon2 from 'argon2';
import request from 'supertest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/prisma/prisma.service';
import { seedRbac } from '../../prisma/seed/rbac';

/**
 * Shared e2e harness: one booted app + its Prisma client, a truncate helper and
 * a couple of factory functions. Kept deliberately lean — specs that need the
 * full fixture seed call `seedGov` themselves.
 */
export interface TestContext {
  app: NestFastifyApplication;
  prisma: PrismaService;
  url: string;
}

export async function bootTestApp(): Promise<TestContext> {
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const prisma = app.get(PrismaService);
  return { app, prisma, url: await app.getUrl() };
}

export async function reset(prisma: PrismaService): Promise<void> {
  await prisma.truncateAll();
  await seedRbac(prisma);
}

/** Logs in via the real endpoint and returns the bearer header value. */
export async function bearer(
  url: string,
  email: string,
  password = 'jansetu-dev',
): Promise<string> {
  const res = await request(url).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return `Bearer ${res.body.accessToken}`;
}

export async function createStaffUser(
  prisma: PrismaService,
  opts: {
    email: string;
    password: string;
    roleKey: string;
    jurisdictionId?: string | null;
    displayName?: string;
  },
) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: opts.roleKey } });
  return prisma.user.create({
    data: {
      kind: 'staff',
      email: opts.email,
      displayName: opts.displayName ?? 'Test Staff',
      passwordHash: await argon2.hash(opts.password, { type: argon2.argon2id }),
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: role.id, jurisdictionId: opts.jurisdictionId ?? null } },
    },
  });
}
