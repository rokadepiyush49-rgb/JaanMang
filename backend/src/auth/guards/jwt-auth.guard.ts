import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ProblemException } from '../../common/errors/problem';

/** Set on the request while resolving a caller whose absence is not an error. */
const OPTIONAL_AUTH = Symbol('optionalAuth');

type MaybeOptional = FastifyRequest & { [OPTIONAL_AUTH]?: true };

/**
 * Authentication is deny-by-default. Registered as a global guard in
 * `AuthModule`; every route requires a valid access token unless it carries
 * `@Public()`.
 *
 * `@Public()` means "a session is not required", not "a session is ignored".
 * A public route still resolves the caller when one is presented, and simply
 * proceeds anonymously when they are not. Without that, a signed-in citizen
 * filing a report through the open intake endpoint would have it recorded as
 * anonymous, and `/reports/mine` would never show them their own report — the
 * session was sitting in the request the whole time and the guard threw it
 * away. Every failure mode here (no token, expired, malformed, revoked) is the
 * same outcome: the handler runs, `@CurrentUser()` is undefined.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) return (await super.canActivate(context)) as boolean;

    const req = context.switchToHttp().getRequest<MaybeOptional>();
    if (!req.headers.authorization) return true;

    req[OPTIONAL_AUTH] = true;
    try {
      await super.canActivate(context);
    } catch {
      // A bad token on an open endpoint is not the endpoint's problem.
    }
    return true;
  }

  handleRequest<TUser>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const req = context.switchToHttp().getRequest<MaybeOptional>();
    if (req[OPTIONAL_AUTH]) return user || (undefined as TUser);

    if (err) throw err;
    if (!user) throw ProblemException.unauthenticated();
    return user;
  }
}
