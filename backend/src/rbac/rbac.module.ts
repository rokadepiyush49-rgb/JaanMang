import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { SurfaceGuard } from './surface.guard';
import { ScopeService } from './scope.service';

/**
 * Authorization, in three layers.
 *
 *   `SurfaceGuard`      — is this endpoint's workspace this user's workspace?
 *   `PermissionsGuard`  — may they perform this particular action?
 *   `ScopeService`      — which records are inside their jurisdiction?
 *
 * Both guards are global and inert unless a route or controller declares
 * `@Surfaces` / `@Permissions`. Scoping is injected into the repository layer of
 * every scoped module so a forgotten call fails closed (an unfiltered query
 * returns nothing a plain `findMany` wouldn't, but the detail/mutation asserts
 * explicitly).
 */
@Global()
@Module({
  providers: [
    ScopeService,
    { provide: APP_GUARD, useClass: SurfaceGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [ScopeService],
})
export class RbacModule {}
