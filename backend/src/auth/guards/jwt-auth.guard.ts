import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ProblemException } from '../../common/errors/problem';

/**
 * Authentication is deny-by-default. Registered as a global guard in
 * `AuthModule`; every route requires a valid access token unless it carries
 * `@Public()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err) throw err;
    if (!user) throw ProblemException.unauthenticated();
    return user;
  }
}
