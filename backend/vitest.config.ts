import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests. These exercise pure domain logic (the priority engine, the RBAC
 * scope resolver, DTO schemas) and Nest providers with mocked dependencies —
 * no database, no HTTP server. See vitest.e2e.config.ts for the full-stack pass.
 *
 * SWC compiles TypeScript AND emits the `emitDecoratorMetadata` that Nest's DI
 * relies on — esbuild (what tsx/vite use) cannot, so the transform is pinned.
 */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/unit/**/*.spec.ts'],
    environment: 'node',
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
