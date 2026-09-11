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

  /**
   * Resolves the full principal (roles, permissions, scopes, surface) for a
   * user id.
   *
   * A `pending` account resolves normally — it holds a real session so the
   * client can explain the wait — and `AccountStatusGuard` is what keeps it out
   * of everything except the routes marked `@AllowPending()`. Suspended and
   * soft-deleted accounts resolve to nothing at all.
   */
  async principalFor(userId: string): Promise<AuthPrincipal | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: { select: { onboardedAt: true } },
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user || user.deletedAt || user.status === 'suspended') return null;

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

    // The surface belongs to the highest-ranked role the user holds, so
    // someone who is both a student and a faculty member lands in the more
    // privileged workspace and can still reach the other one.
    const top = user.roles.map((ur) => ur.role).sort((a, b) => b.rank - a.rank)[0];

    return {
      userId: user.id,
      kind: user.kind,
      status: user.status,
      displayName: user.displayName,
      surface: top?.surface ?? 'citizen',
      onboarded: await this.isOnboarded(user.id, roles, user.studentProfile?.onboardedAt ?? null),
      roles,
      permissions,
      orgIds: [...orgIds],
      jurisdictionIds: [...jurisdictionIds],
    };
  }

  /**
   * Whether every wizard this user's roles require has been completed.
   *
   * Three roles have one. A government account has no wizard — everything it
   * needs was collected at signup, because a reviewer cannot verify a half-filled
   * application.
   */
  private async isOnboarded(
    userId: string,
    roles: string[],
    studentOnboardedAt: Date | null,
  ): Promise<boolean> {
    if (roles.includes('student')) return studentOnboardedAt !== null;
    if (roles.some((r) => r.startsWith('industry_'))) {
      const membership = await this.prisma.orgMembership.findFirst({
        where: { userId },
        select: { org: { select: { industryInfo: { select: { onboardedAt: true } } } } },
      });
      return membership?.org.industryInfo?.onboardedAt != null;
    }
    // An institute administrator draws the academic structure in a wizard; a
    // faculty member joins an institution that already has one.
    if (roles.includes('institute_admin')) {
      const membership = await this.prisma.orgMembership.findFirst({
        where: { userId, org: { type: 'institution' } },
        select: { org: { select: { institution: { select: { onboardedAt: true } } } } },
      });
      return membership?.org.institution?.onboardedAt != null;
    }
    return true;
  }

  private assertActive(user: User): void {
    if (user.deletedAt || user.status === 'suspended') {
      throw ProblemException.forbidden('This account is not active.');
    }
  }

  /** Hashes a password with the same parameters registration and reset use. */
  hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON_OPTS);
  }

  /** Issues a token pair for a freshly created account. */
  issueFor(user: User, userAgent?: string): Promise<TokenPair> {
    return this.issueTokens(user, userAgent);
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
