import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as reachable without authentication.
 *
 * Authentication is deny-by-default: a global `JwtAuthGuard` (stage 2) protects
 * every route, and `@Public()` is the explicit opt-out — used by the health
 * probes, the auth endpoints themselves, and the public ledger.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
