import { SetMetadata } from '@nestjs/common';

/**
 * Requires the caller to hold every listed permission.
 *
 *   @Permissions('problem.validate')
 *   @Post(':id/validate')
 *   validate(...) { ... }
 *
 * The permission strings are the closed union from
 * apps/web/src/lib/gov/types.ts, seeded in prisma/seed/rbac.ts. Enforced by the
 * global `PermissionsGuard`; a route with no `@Permissions` is unrestricted
 * beyond authentication.
 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...keys: string[]) => SetMetadata(PERMISSIONS_KEY, keys);
