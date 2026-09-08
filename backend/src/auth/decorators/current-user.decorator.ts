import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuthPrincipal } from '../auth.types';

/**
 * Injects the authenticated principal into a handler parameter.
 *
 *   handler(@CurrentUser() user: AuthPrincipal) { ... }
 *
 * Only valid on routes behind the auth guard (i.e. not `@Public()`); there it
 * is always present.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest & { user: AuthPrincipal }>();
    return req.user;
  },
);
