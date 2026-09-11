import { Body, Controller, Get, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { OtpPurpose } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { AllowPending } from './decorators/allow-pending.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  LoginDto,
  LogoutDto,
  OtpRequestDto,
  OtpVerifyDto,
  PasswordResetDto,
  PasswordResetRequestDto,
  RefreshDto,
} from './dto/auth.dto';
import type { AuthPrincipal } from './auth.types';

/**
 * 10 requests/min in real environments; effectively off under test.
 *
 * These are the credential-guessing endpoints, so the bucket is deliberately
 * far below the API default. `PrincipalThrottlerGuard` keys it on the IP here
 * rather than the account, because none of these routes has an authenticated
 * caller yet — which is the whole point of them.
 */
const AUTH_THROTTLE = {
  default: { ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 10 },
};

/**
 * `/auth/me` is the exception, and needs its own far larger bucket.
 *
 * It is not a credential endpoint — the caller is already authenticated — and
 * it is the most-called route in the product: the web app resolves the session
 * through it on every server render, and the government store calls it again on
 * mount. At 10/min a signed-in officer locked themselves out of their own
 * workspace by navigating between eight screens.
 */
const ME_THROTTLE = {
  default: { ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 300 },
};

/**
 * `/api/v1/auth/*`. Every route here is `@Public()` except `/me`, and every
 * route is on a tighter rate limit than the rest of the API (10 / minute) —
 * except `/me`, which overrides it for the reason given above.
 */
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('otp/request')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a login OTP to a phone number' })
  async requestOtp(@Body() dto: OtpRequestDto) {
    const purpose = dto.purpose === 'phone_verify' ? OtpPurpose.phone_verify : OtpPurpose.login;
    const { devCode } = await this.auth.requestOtp(dto.phone, purpose);
    return { sent: true, ...(devCode ? { devCode } : {}) };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify an OTP and sign in (creates a citizen account on first use)' })
  verifyOtp(@Body() dto: OtpVerifyDto, @Headers('user-agent') ua?: string) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.displayName, ua);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with email and password (staff)' })
  login(@Body() dto: LoginDto, @Headers('user-agent') ua?: string) {
    return this.auth.loginWithPassword(dto.email, dto.password, ua);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair (rotating)' })
  refresh(@Body() dto: RefreshDto, @Headers('user-agent') ua?: string) {
    return this.auth.refresh(dto.refreshToken, ua);
  }

  @Post('logout')
  @HttpCode(204)
  @AllowPending()
  @ApiOperation({ summary: 'Revoke the current refresh token (or all sessions)' })
  async logout(@CurrentUser() user: AuthPrincipal, @Body() dto: LogoutDto) {
    await this.auth.logout(dto.refreshToken, user.userId);
  }

  @Public()
  @Post('password/reset-request')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset link' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    const { devToken } = await this.auth.requestPasswordReset(dto.email);
    return { sent: true, ...(devToken ? { devToken } : {}) };
  }

  @Public()
  @Post('password/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  async resetPassword(@Body() dto: PasswordResetDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { reset: true };
  }

  /**
   * The session, as the client needs it.
   *
   * `surface` is the authoritative answer to "which workspace does this person
   * belong in" and is computed from the user's highest-ranked role, never from
   * anything the client sends. The web app routes on it; the edge guard checks
   * it. `onboarded` tells the client whether to send them to a wizard first.
   *
   * The role-specific block (`student` / `organisation`) is inlined so the
   * shells can render an identity without a second round trip.
   */
  @Get('me')
  @Throttle(ME_THROTTLE)
  @AllowPending()
  @ApiOperation({ summary: 'The authenticated user, with roles, permissions, scopes and surface' })
  async me(@CurrentUser() principal: AuthPrincipal, @Req() _req: FastifyRequest) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: principal.userId },
      select: {
        id: true,
        kind: true,
        displayName: true,
        email: true,
        phone: true,
        photoUrl: true,
        locale: true,
        status: true,
        studentProfile: {
          select: {
            institutionName: true,
            degree: true,
            branch: true,
            currentYear: true,
            graduationYear: true,
            state: true,
            district: true,
            skills: true,
            interests: true,
            onboardedAt: true,
          },
        },
        orgMemberships: {
          take: 1,
          select: {
            designation: true,
            org: {
              select: {
                id: true,
                type: true,
                name: true,
                legalName: true,
                sector: true,
                govBody: { select: { bodyType: true, state: true, district: true, lgdCode: true } },
                industryInfo: { select: { onboardedAt: true, csrThemes: true, geographies: true } },
                institution: {
                  select: {
                    shortName: true,
                    institutionType: true,
                    city: true,
                    state: true,
                    accreditation: true,
                    onboardedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const membership = user.orgMemberships[0];

    return {
      id: user.id,
      kind: user.kind,
      status: user.status,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      locale: user.locale,
      surface: principal.surface,
      onboarded: principal.onboarded,
      roles: principal.roles,
      permissions: [...principal.permissions].sort(),
      orgIds: principal.orgIds,
      jurisdictionIds: principal.jurisdictionIds,
      student: user.studentProfile,
      organisation: membership ? { ...membership.org, designation: membership.designation } : null,
    };
  }
}
