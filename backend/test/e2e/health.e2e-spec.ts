import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { createApp } from '../../src/bootstrap';

describe('health (e2e)', () => {
  let app: NestFastifyApplication;
  let url: string;

  beforeAll(async () => {
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /healthz → 200', async () => {
    const res = await request(url).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /readyz → 200 with the database reachable', async () => {
    const res = await request(url).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('ok');
  });

  it('unknown route → problem+json 404', async () => {
    const res = await request(url).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ status: 404, code: expect.any(String) });
  });
});
