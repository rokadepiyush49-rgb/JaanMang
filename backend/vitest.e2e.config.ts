import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * End-to-end tests. Boot the real Nest application against a real Postgres
 * (a disposable database — a local container or a throwaway Neon branch, set
 * via DATABASE_URL/DIRECT_URL), run migrations + seed, and drive it over HTTP
 * with supertest. Runs serially: the tests share one database.
 */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/e2e/**/*.e2e-spec.ts'],
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    setupFiles: ['test/e2e/setup.ts'],
  },
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname,
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
        keepClassNames: true,
      },
    }),
  ],
});
