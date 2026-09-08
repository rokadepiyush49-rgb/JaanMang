import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ScopeService } from './scope.service';

/**
 * Authorization. The permission check is a global guard (inert unless a route
 * declares `@Permissions`); jurisdiction/org scoping is `ScopeService`, injected
 * into the repository layer of every scoped module so a forgotten call fails
 * closed (an unfiltered query returns nothing a plain `findMany` wouldn't, but
 * the detail/mutation asserts explicitly).
 */
@Global()
@Module({
  providers: [ScopeService, { provide: APP_GUARD, useClass: PermissionsGuard }],
  exports: [ScopeService],
})
export class RbacModule {}
