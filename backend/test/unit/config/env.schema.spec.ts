import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../src/config/env.schema';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
};

describe('loadEnv', () => {
  it('applies defaults and coerces types', () => {
    const env = loadEnv({ ...base } as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual([]);
    expect(env.JWT_ACCESS_TTL).toBe('15m');
  });

  it('splits CORS_ORIGINS on commas', () => {
    const env = loadEnv({
      ...base,
      CORS_ORIGINS: 'http://a.test, http://b.test ,',
    } as NodeJS.ProcessEnv);
    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
  });

  it('throws a readable error listing every problem', () => {
    expect(() => loadEnv({ JWT_ACCESS_SECRET: 'short' } as NodeJS.ProcessEnv)).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects a malformed duration', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_TTL: '15 minutes' } as NodeJS.ProcessEnv)).toThrow();
  });
});
