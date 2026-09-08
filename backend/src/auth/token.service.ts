import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import { ProblemCode, ProblemException } from '../common/errors/problem';
import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

/**
 * Signs and verifies the two token types. Access and refresh use separate
 * secrets so a leaked access token can never be replayed as a refresh token,
 * and vice versa.
 *
 * Refresh tokens are opaque to the client but are JWTs internally: the payload
 * carries the `RefreshToken` row id (`jti`) so rotation and logout can target
 * one exact token, and the raw string is also stored hashed (`sha256`) so a
 * database leak does not hand an attacker live sessions.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccessToken(userId: string, kind: AccessTokenPayload['kind']): string {
    return this.jwt.sign(
      { sub: userId, kind, typ: 'access' } satisfies AccessTokenPayload,
      this.signOpts(this.config.jwt.accessSecret, this.config.jwt.accessTtl),
    );
  }

  signRefreshToken(userId: string, jti: string): string {
    return this.jwt.sign(
      { sub: userId, jti, typ: 'refresh' } satisfies RefreshTokenPayload,
      this.signOpts(this.config.jwt.refreshSecret, this.config.jwt.refreshTtl),
    );
  }

  /** `expiresIn` is a validated duration string ("15m", "30d"); jsonwebtoken
   *  accepts it at runtime but its types want the `ms` StringValue union. */
  private signOpts(secret: string, expiresIn: string): JwtSignOptions {
    return { secret, expiresIn } as JwtSignOptions;
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verify<AccessTokenPayload>(token, this.config.jwt.accessSecret);
    if (payload.typ !== 'access') {
      throw ProblemException.unauthenticated('Wrong token type.');
    }
    return payload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify<RefreshTokenPayload>(token, this.config.jwt.refreshSecret);
    if (payload.typ !== 'refresh') {
      throw ProblemException.unauthenticated('Wrong token type.');
    }
    return payload;
  }

  /** Opaque random material to salt into the refresh token id space if needed. */
  randomId(): string {
    return randomBytes(16).toString('hex');
  }

  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Access token lifetime in seconds, for the `expiresIn` response field. */
  accessTtlSeconds(): number {
    return durationToSeconds(this.config.jwt.accessTtl);
  }

  refreshExpiryDate(): Date {
    return new Date(Date.now() + durationToSeconds(this.config.jwt.refreshTtl) * 1000);
  }

  private verify<T extends object>(token: string, secret: string): T {
    try {
      return this.jwt.verify<T>(token, { secret });
    } catch (error) {
      const expired = error instanceof Error && error.name === 'TokenExpiredError';
      throw ProblemException.unauthenticated(
        expired ? 'Token expired.' : 'Invalid token.',
        expired ? ProblemCode.TOKEN_EXPIRED : ProblemCode.UNAUTHENTICATED,
      );
    }
  }
}

const UNIT_SECONDS: Record<string, number> = { ms: 0.001, s: 1, m: 60, h: 3600, d: 86400 };

export function durationToSeconds(d: string): number {
  const m = /^(\d+)(ms|s|m|h|d)$/.exec(d);
  if (!m) throw new Error(`bad duration: ${d}`);
  return Math.round(Number(m[1]) * UNIT_SECONDS[m[2]]);
}
