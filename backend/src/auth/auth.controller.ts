import { Body, Controller, Get, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { OtpPurpose } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
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

/** 10 requests/min per IP in real environments; effectively off under test. */
const AUTH_THROTTLE = {
  default: { ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 10 },
};

/**
 * `/api/v1/auth/*`. Every route here is `@Public()` except `/me`, and every
 * route is on a tighter rate limit than the rest of the API (10 / minute).
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

  @Get('me')
  @ApiOperation({ summary: 'The authenticated user, with roles, permissions and scopes' })
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
      },
    });
    return {
      ...user,
      roles: principal.roles,
      permissions: [...principal.permissions].sort(),
      orgIds: principal.orgIds,
      jurisdictionIds: principal.jurisdictionIds,
    };
  }
}
