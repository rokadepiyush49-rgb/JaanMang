import { Body, Controller, Get, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AllowPending } from './decorators/allow-pending.decorator';
import { RegistrationService } from './registration.service';
import {
  EmailAvailableDto,
  GovernmentRegisterDto,
  IndustryOnboardingDto,
  IndustryRegisterDto,
  InstituteOnboardingDto,
  InstituteRegisterDto,
  StudentOnboardingDto,
  StudentRegisterDto,
} from './registration.dto';
import type { AuthPrincipal } from './auth.types';

/**
 * `/api/v1/auth/register/*` and `/api/v1/auth/onboarding/*`.
 *
 * Registration is public and rate-limited harder than the rest of `/auth`:
 * each one writes a row, and a signup endpoint at the default limit is a
 * database-filling machine. Onboarding is authenticated, and is reachable by a
 * pending account so an approved partner can fill in their match profile while
 * the rest of the portal is still closed to them.
 */
const REGISTER_THROTTLE = {
  default: { ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 5 },
};

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class RegistrationController {
  constructor(
    private readonly registration: RegistrationService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('email-available')
  @Throttle({ default: { ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 30 } })
  @ApiOperation({ summary: 'Whether an email address is free to register' })
  async emailAvailable(@Query() query: EmailAvailableDto) {
    return { available: await this.registration.isEmailAvailable(query.email) };
  }

  @Public()
  @Post('register/student')
  @HttpCode(201)
  @Throttle(REGISTER_THROTTLE)
  @ApiOperation({ summary: 'Create a student account and sign in' })
  registerStudent(@Body() dto: StudentRegisterDto, @Headers('user-agent') ua?: string) {
    return this.registration.registerStudent(dto, ua);
  }

  @Public()
  @Post('register/government')
  @HttpCode(201)
  @Throttle(REGISTER_THROTTLE)
  @ApiOperation({
    summary: 'Register a government authority and its representative (pending review)',
  })
  registerGovernment(@Body() dto: GovernmentRegisterDto, @Headers('user-agent') ua?: string) {
    return this.registration.registerGovernment(dto, ua);
  }

  @Public()
  @Post('register/industry')
  @HttpCode(201)
  @Throttle(REGISTER_THROTTLE)
  @ApiOperation({ summary: 'Register an industry partner and its representative (pending review)' })
  registerIndustry(@Body() dto: IndustryRegisterDto, @Headers('user-agent') ua?: string) {
    return this.registration.registerIndustry(dto, ua);
  }

  @Public()
  @Post('register/institute')
  @HttpCode(201)
  @Throttle(REGISTER_THROTTLE)
  @ApiOperation({
    summary: 'Register an institution and its administrator (pending review)',
  })
  registerInstitute(@Body() dto: InstituteRegisterDto, @Headers('user-agent') ua?: string) {
    return this.registration.registerInstitute(dto, ua);
  }

  @Post('onboarding/student')
  @HttpCode(200)
  @ApiOperation({ summary: 'Complete the student onboarding wizard' })
  async onboardStudent(@CurrentUser() user: AuthPrincipal, @Body() dto: StudentOnboardingDto) {
    await this.registration.completeStudentOnboarding(user.userId, dto);
    return { onboarded: true };
  }

  @Post('onboarding/industry')
  @HttpCode(200)
  @AllowPending()
  @ApiOperation({ summary: 'Complete the industry match profile' })
  async onboardIndustry(@CurrentUser() user: AuthPrincipal, @Body() dto: IndustryOnboardingDto) {
    await this.registration.completeIndustryOnboarding(user.userId, dto);
    return { onboarded: true };
  }

  @Post('onboarding/institute')
  @HttpCode(200)
  @AllowPending()
  @ApiOperation({ summary: 'Complete the institute academic structure wizard' })
  async onboardInstitute(@CurrentUser() user: AuthPrincipal, @Body() dto: InstituteOnboardingDto) {
    await this.registration.completeInstituteOnboarding(user.userId, dto);
    return { onboarded: true };
  }

  /**
   * What a pending applicant is told while they wait.
   *
   * It names the status, what was submitted and which automated checks passed,
   * because "pending" with no detail is indistinguishable from "broken".
   */
  @Get('verification')
  @AllowPending()
  @ApiOperation({ summary: 'The signed-in account’s verification status' })
  async verification(@CurrentUser() user: AuthPrincipal) {
    const membership = await this.prisma.orgMembership.findFirst({
      where: { userId: user.userId },
      select: { orgId: true, designation: true, org: { select: { name: true, type: true } } },
    });

    const row = await this.prisma.accountVerification.findFirst({
      where: membership
        ? { subjectType: 'organization', subjectId: membership.orgId }
        : { subjectType: 'user', subjectId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: row?.status ?? (user.status === 'pending' ? 'pending' : 'verified'),
      accountStatus: user.status,
      requestedRoleKey: row?.requestedRoleKey ?? null,
      organisation: membership
        ? {
            name: membership.org.name,
            type: membership.org.type,
            designation: membership.designation,
          }
        : null,
      submittedAt: row?.createdAt ?? null,
      reviewedAt: row?.reviewedAt ?? null,
      reason: row?.reason ?? null,
      signals: row?.signals ?? {},
    };
  }
}
