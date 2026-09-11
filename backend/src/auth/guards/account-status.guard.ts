import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ProblemException } from '../../common/errors/problem';
import type { AuthPrincipal } from '../auth.types';
import { ALLOW_PENDING_KEY } from '../decorators/allow-pending.decorator';

/**
 * Keeps an unverified account inside its waiting room.
 *
 * A pending government or industry account is a claim of authority that nobody
 * has checked yet. It gets a real session — otherwise the person cannot be told
 * what happens next — but every route is closed to it except the ones marked
 * `@AllowPending()`.
 *
 * Runs after `JwtAuthGuard`, so `request.user` is populated.
 */
@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthPrincipal }>();
    const user = req.user;
    if (!user || user.status !== 'pending') return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    throw ProblemException.forbidden(
      'This account is awaiting verification. You will be notified once it is reviewed.',
    );
  }
}
