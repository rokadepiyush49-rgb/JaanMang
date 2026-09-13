import { Body, Controller, HttpCode, Param, Post, UseInterceptors } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { SponsorshipService } from './sponsorship.service';
import { ApproveSponsorshipDto, DeclineSponsorshipDto } from './sponsorship.dto';

/**
 * `/api/v1/problems/:id/sponsorship/*`.
 *
 * `@Surfaces('gov')` and `@UseInterceptors(IdempotencyInterceptor)` sit on the
 * class so a route added here is closed and replay-safe by default. Every one
 * of these changes who is paying for something.
 */
@ApiTags('sponsorship')
@Controller({ path: 'problems', version: '1' })
@Surfaces('gov')
@UseInterceptors(IdempotencyInterceptor)
@ApiHeader({
  name: 'Idempotency-Key',
  required: false,
  description: 'Send the same key on a retry and the transition happens once.',
})
export class SponsorshipController {
  constructor(private readonly sponsorship: SponsorshipService) {}

  @Post(':id/sponsorship/invite')
  @HttpCode(200)
  @Permissions('sponsorship.invite')
  @ApiOperation({ summary: 'Invite every matched industry to sponsor this problem' })
  invite(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.sponsorship.invite(user, id);
  }

  @Post(':id/sponsorship/approve')
  @HttpCode(200)
  @Permissions('sponsorship.approve')
  @ApiOperation({ summary: "Accept an industry's sponsorship proposal" })
  approve(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: ApproveSponsorshipDto,
  ) {
    return this.sponsorship.approve(user, id, dto);
  }

  @Post(':id/sponsorship/decline')
  @HttpCode(200)
  @Permissions('sponsorship.invite')
  @ApiOperation({
    summary: 'Record that an industry declined',
    description:
      'When the last sponsor still in play declines, the government funding fallback fires in ' +
      'the same transaction — an officer should not have to notice that industry ran out.',
  })
  decline(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: DeclineSponsorshipDto,
  ) {
    return this.sponsorship.decline(user, id, dto);
  }

  @Post(':id/sponsorship/fallback')
  @HttpCode(200)
  @Permissions('sponsorship.invite')
  @ApiOperation({
    summary: 'Abandon sponsorship and fall back to government funding',
    description:
      'Recommends a source and says whether the department can afford it. It does not approve ' +
      'anything: moving public money stays a decision somebody with funding.approve makes.',
  })
  fallback(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.sponsorship.fallback(user, id);
  }
}
