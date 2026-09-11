import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../config/app-config.service';
import { ProblemException } from '../common/errors/problem';
import { AuthService } from './auth.service';
import type { AccessTokenPayload, AuthPrincipal } from './auth.types';

/**
 * Validates the access token and resolves the caller's full principal (roles,
 * permissions, jurisdiction/org scopes) from the database. Passport attaches
 * the return value as `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.accessSecret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthPrincipal> {
    if (payload.typ !== 'access') {
      throw ProblemException.unauthenticated('Wrong token type.');
    }
    const principal = await this.auth.principalFor(payload.sub);
    if (!principal) {
      throw ProblemException.unauthenticated('This account is no longer active.');
    }
    return principal;
  }
}
