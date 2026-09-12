import { Body, Controller, HttpCode, Param, Post, UseInterceptors } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { FundingService } from './funding.service';
import { ApproveFundingDto, RejectFundingDto } from './funding.dto';

/**
 * `/api/v1/problems/:id/funding/*` — government money.
 *
 * The idempotency interceptor matters more here than anywhere else in the API.
 * The web proxy has forwarded `Idempotency-Key` since it was written; without
 * something reading it, a double-tapped approve on a slow connection committed
 * a department's budget twice against one problem.
 */
@ApiTags('funding')
@Controller({ path: 'problems', version: '1' })
@Surfaces('gov')
@UseInterceptors(IdempotencyInterceptor)
@ApiHeader({
  name: 'Idempotency-Key',
  required: false,
  description: 'Send the same key on a retry and the budget is committed once.',
})
export class FundingController {
  constructor(private readonly funding: FundingService) {}

  @Post(':id/funding/approve')
  @HttpCode(200)
  @Permissions('funding.approve')
  @ApiOperation({
    summary: 'Approve government funding',
    description:
      "One transaction: moves the department's committed budget, writes the allocation and the " +
      'public ledger entry, and creates the project. A committed budget with no ledger entry is ' +
      'a corrupt book, so either all of it lands or none of it does.',
  })
  approve(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: ApproveFundingDto,
  ) {
    return this.funding.approve(user, id, dto);
  }

  @Post(':id/funding/reject')
  @HttpCode(200)
  @Permissions('funding.approve')
  @ApiOperation({ summary: 'Refuse government funding, with a reason that stays on the record' })
  reject(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: RejectFundingDto,
  ) {
    return this.funding.reject(user, id, dto);
  }
}
