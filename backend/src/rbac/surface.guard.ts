import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Surface } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ProblemException } from '../common/errors/problem';
import type { AuthPrincipal } from '../auth/auth.types';
import { SURFACES_KEY } from './surface.decorator';

/**
 * Enforces `@Surfaces(...)`. Global, and inert on routes that declare none.
 *
 * A platform administrator passes everything — they review accounts on every
 * surface and cannot do that from outside one.
 *
 * The refusal is a 404, not a 403, for the same reason `ScopeService` returns
 * one for an out-of-scope record: telling a student that `/gov/officers`
 * exists and is forbidden is itself a disclosure about how the platform is
 * shaped.
 */
@Injectable()
export class SurfaceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Surface[] | undefined>(SURFACES_KEY, [
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

    if (user.surface === 'admin' || required.includes(user.surface)) return true;

    throw ProblemException.notFound('Not found.');
  }
}
