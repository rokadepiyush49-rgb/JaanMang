import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { OtpPurpose, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { ProblemException } from '../common/errors/problem';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import type { AuthPrincipal, TokenPair } from './auth.types';

const ARGON_OPTS: argon2.Options = { type: argon2.argon2id };

/**
 * The authentication surface.
 *
 *   citizen : phone → OTP → tokens          (account created on first verify)
 *   staff   : email + password → tokens
 *
 * Refresh tokens rotate on every use: the presented one is revoked and a fresh
 * pair issued, so a stolen refresh token is usable at most once before the
 * legitimate client's next refresh invalidates it (reuse is detectable).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  /* ------------------------------------------------------------------ OTP */

  requestOtp(phone: string, purpose: OtpPurpose) {
    return this.otp.issue(phone, purpose);
  }

  async verifyOtp(
    phone: string,
    code: string,
    displayName: string | undefined,
    userAgent?: string,
  ): Promise<TokenPair> {
    await this.otp.consume(phone, OtpPurpose.login, code);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          kind: 'citizen',
          phone,
          displayName: displayName?.trim() || 'Citizen',
          phoneVerifiedAt: new Date(),
          roles: { create: { role: { connect: { key: 'citizen' } } } },
        },
      });
      this.logger.log(`New citizen registered (${user.id})`);
    } else if (!user.phoneVerifiedAt) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      });
    }

    this.assertActive(user);
    return this.issueTokens(user, userAgent);
  }

  /* -------------------------------------------------------------- password */

  async loginWithPassword(email: string, password: string, userAgent?: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const invalid = ProblemException.unauthenticated('Email or password is incorrect.');

    // Verify against a real dummy hash when the user is absent (or has no
    // password) so the response time does not reveal whether the email exists.
    const hash = user?.passwordHash ?? (await dummyHash());
    const ok = await argon2.verify(hash, password).catch(() => false);
    if (!user || !user.passwordHash || !ok) throw invalid;

    this.assertActive(user);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user, userAgent);
  }

  /* --------------------------------------------------------------- refresh */

  async refresh(rawToken: string, userAgent?: string): Promise<TokenPair> {
    const payload = this.tokens.verifyRefreshToken(rawToken);
    const row = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });

    if (!row || row.userId !== payload.sub) {
      throw ProblemException.unauthenticated('Invalid refresh token.');
    }
    if (row.revokedAt) {
      // The token was already rotated away — someone is replaying it. Burn the
      // whole family so the legitimate user has to sign in again.
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw ProblemException.unauthenticated('This session has been revoked.');
    }
    if (row.expiresAt < new Date() || row.tokenHash !== this.tokens.hash(rawToken)) {
      throw ProblemException.unauthenticated('Invalid refresh token.');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: row.userId } });
    this.assertActive(user);

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user, userAgent);
  }

  async logout(rawToken: string | undefined, userId: string): Promise<void> {
    if (rawToken) {
      const payload = safeParse(() => this.tokens.verifyRefreshToken(rawToken));
      if (payload?.sub === userId) {
        await this.prisma.refreshToken.updateMany({
          where: { id: payload.jti, userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
    // No token given (or not ours): revoke every session for this user.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /* -------------------------------------------------------- password reset */

  async requestPasswordReset(email: string): Promise<{ devToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success shape — do not reveal whether the email is known.
    if (!user || !user.passwordHash) return {};

    const raw = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokens.hash(raw),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    if (this.config.isDev) {
      this.logger.warn(`Password reset token for ${email}: ${raw}`);
      return { devToken: raw };
    }
    // TODO(stage 9): email the reset link via the notification channel.
    return {};
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokens.hash(rawToken) },
    });
    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw ProblemException.badRequest('This reset link is invalid or has expired.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: await argon2.hash(newPassword, ARGON_OPTS) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      }),
      // A password reset kills every existing session.
      this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /* --------------------------------------------------------------- helpers */

  /** Resolves the full principal (roles, permissions, scopes) for a user id. */
  async principalFor(userId: string): Promise<AuthPrincipal | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user || user.deletedAt || user.status !== 'active') return null;

    const permissions = new Set<string>();
    const roles: string[] = [];
    const orgIds = new Set<string>();
    const jurisdictionIds = new Set<string>();

    for (const ur of user.roles) {
      roles.push(ur.role.key);
      for (const rp of ur.role.permissions) permissions.add(rp.permission.key);
      if (ur.orgId) orgIds.add(ur.orgId);
      if (ur.jurisdictionId) jurisdictionIds.add(ur.jurisdictionId);
    }

    return {
      userId: user.id,
      kind: user.kind,
      displayName: user.displayName,
      roles,
      permissions,
      orgIds: [...orgIds],
      jurisdictionIds: [...jurisdictionIds],
    };
  }

  private assertActive(user: User): void {
    if (user.deletedAt || user.status === 'suspended') {
      throw ProblemException.forbidden('This account is not active.');
    }
  }

  private async issueTokens(user: User, userAgent?: string): Promise<TokenPair> {
    const row = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: 'pending',
        userAgent: userAgent?.slice(0, 256),
        expiresAt: this.tokens.refreshExpiryDate(),
      },
    });
    const refreshToken = this.tokens.signRefreshToken(user.id, row.id);
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { tokenHash: this.tokens.hash(refreshToken) },
    });

    return {
      accessToken: this.tokens.signAccessToken(user.id, user.kind),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.accessTtlSeconds(),
    };
  }
}

/** A real argon2id hash, computed once, for constant-time failed logins. */
let dummyHashPromise: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash(randomBytes(24).toString('hex'), ARGON_OPTS);
  return dummyHashPromise;
}

function safeParse<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}
