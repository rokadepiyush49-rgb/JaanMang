import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ProblemException } from '../common/errors/problem';
import type { AuthPrincipal } from '../auth/auth.types';
import { PERMISSIONS_KEY } from './permissions.decorator';

/**
 * Enforces `@Permissions(...)`. Global (registered in `RbacModule`) but inert
 * on routes that declare no permissions or are `@Public()`.
 *
 * Runs after `JwtAuthGuard`, so `request.user` is always populated here.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthPrincipal }>();
    const user = req.user;
    if (!user) throw ProblemException.unauthenticated();

    const missing = required.filter((key) => !user.permissions.has(key));
    if (missing.length) {
      throw ProblemException.forbidden(
        `This action needs the ${missing.map((m) => `"${m}"`).join(', ')} permission.`,
      );
    }
    return true;
  }
}
