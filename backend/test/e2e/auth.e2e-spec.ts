import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootTestApp, createStaffUser, reset, type TestContext } from './app';

describe('auth (e2e)', () => {
  let ctx: TestContext;
  const api = () => request(ctx.url);

  beforeAll(async () => {
    ctx = await bootTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await reset(ctx.prisma);
  });

  describe('email + password', () => {
    beforeEach(async () => {
      await createStaffUser(ctx.prisma, {
        email: 'officer@example.test',
        password: 'correct-horse',
        roleKey: 'gov_block',
        displayName: 'Test Officer',
      });
    });

    it('signs in and returns a token pair', async () => {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'officer@example.test', password: 'correct-horse' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: expect.any(Number) });
      expect(res.body.accessToken).toBeTypeOf('string');
      expect(res.body.refreshToken).toBeTypeOf('string');
    });

    it('rejects a wrong password with a generic 401', async () => {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'officer@example.test', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Email or password is incorrect.');
    });

    it('gives the same answer for an unknown email (no user enumeration)', async () => {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.test', password: 'whatever' });
      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Email or password is incorrect.');
    });

    it('validates the body as problem+json', async () => {
      const res = await api().post('/api/v1/auth/login').send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('/me', () => {
    it('401s without a token', async () => {
      const res = await api().get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('returns the principal with resolved roles, permissions and scope', async () => {
      await createStaffUser(ctx.prisma, {
        email: 'dc@example.test',
        password: 'district-pass',
        roleKey: 'gov_district',
      });
      const login = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'dc@example.test', password: 'district-pass' });

      const me = await api()
        .get('/api/v1/auth/me')
        .set('authorization', `Bearer ${login.body.accessToken}`);

      expect(me.status).toBe(200);
      expect(me.body.roles).toEqual(['gov_district']);
      expect(me.body.permissions).toContain('settings.manage');
      expect(me.body.permissions).toContain('funding.approve');
    });
  });

  describe('phone OTP', () => {
    const phone = '+919800000001';

    it('issues a code and signs in, creating a citizen on first verify', async () => {
      const reqRes = await api().post('/api/v1/auth/otp/request').send({ phone });
      expect(reqRes.status).toBe(200);
      const code = reqRes.body.devCode as string;
      expect(code).toMatch(/^\d{6}$/);

      const verify = await api()
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code, displayName: 'Ramesh' });
      expect(verify.status).toBe(200);
      expect(verify.body.accessToken).toBeTypeOf('string');

      const me = await api()
        .get('/api/v1/auth/me')
        .set('authorization', `Bearer ${verify.body.accessToken}`);
      expect(me.body).toMatchObject({ kind: 'citizen', displayName: 'Ramesh', roles: ['citizen'] });
    });

    it('rejects a wrong code', async () => {
      await api().post('/api/v1/auth/otp/request').send({ phone });
      const res = await api().post('/api/v1/auth/otp/verify').send({ phone, code: '000000' });
      expect(res.status).toBe(400);
    });
  });

  describe('refresh rotation', () => {
    const phone = '+919800000002';

    async function signIn() {
      const { body } = await api().post('/api/v1/auth/otp/request').send({ phone });
      const verify = await api()
        .post('/api/v1/auth/otp/verify')
        .send({ phone, code: body.devCode });
      return verify.body as { accessToken: string; refreshToken: string };
    }

    it('rotates the refresh token and detects reuse of the old one', async () => {
      const first = await signIn();

      const rotated = await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken });
      expect(rotated.status).toBe(200);
      expect(rotated.body.refreshToken).not.toBe(first.refreshToken);

      // Replaying the original (now-revoked) token burns the whole family.
      const replay = await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken });
      expect(replay.status).toBe(401);

      const afterBurn = await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rotated.body.refreshToken });
      expect(afterBurn.status).toBe(401);
    });

    it('logout revokes the session', async () => {
      const s = await signIn();
      const out = await api()
        .post('/api/v1/auth/logout')
        .set('authorization', `Bearer ${s.accessToken}`)
        .send({ refreshToken: s.refreshToken });
      expect(out.status).toBe(204);

      const refresh = await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: s.refreshToken });
      expect(refresh.status).toBe(401);
    });
  });
});
