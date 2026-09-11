import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  ListProblemsQueryDto,
  PublishWeightsDto,
  RejectProblemDto,
  RouteProblemDto,
} from './dto/problems.dto';
import { ProblemsService } from './problems.service';

/**
 * `/api/v1/problems` — the government problem lifecycle.
 *
 * Every route is jurisdiction-scoped in the service layer; a problem outside the
 * caller's subtree is a 404. Mutations require the matching permission from the
 * closed union (see prisma/seed/rbac.ts).
 *
 * The surface gate is belt and braces over that: a student holds no
 * jurisdiction, so scoping already returns them an empty list — but an empty
 * result is a weak thing to rest a disclosure boundary on, and the industry
 * surface has `visibility.ts` precisely because a raw `Problem` carries what a
 * `Challenge` must not.
 */
@ApiTags('problems')
@Controller({ path: 'problems', version: '1' })
@Surfaces('gov')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get()
  @ApiOperation({ summary: 'List problems in the caller’s jurisdiction, ranked' })
  list(@CurrentUser() user: AuthPrincipal, @Query() query: ListProblemsQueryDto) {
    return this.problems.list(user, {
      status: query['filter[status]'],
      category: query['filter[category]'],
      departmentId: query['filter[departmentId]'],
      weights: query.weights,
    });
  }

  @Get('priority')
  @ApiOperation({ summary: 'The published priority weighting for the caller’s jurisdiction' })
  publishedWeights(@CurrentUser() user: AuthPrincipal) {
    return this.problems.publishedWeights(user).then((weights) => ({ weights }));
  }

  @Post('priority/weights')
  @Permissions('settings.manage')
  @ApiOperation({ summary: 'Publish a new priority weighting' })
  publishWeights(@CurrentUser() user: AuthPrincipal, @Body() dto: PublishWeightsDto) {
    return this.problems
      .publishWeights(user, dto.weights, dto.jurisdictionId)
      .then((weights) => ({ weights }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'One problem, with its full lifecycle detail' })
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.problems.get(user, id);
  }

  @Get(':id/reports')
  @ApiOperation({ summary: 'The individual citizen reports behind a problem' })
  reports(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.problems.reports(user, id);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'The audit trail for a problem' })
  audit(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.problems.audits(user, id);
  }

  @Post(':id/validate')
  @Permissions('problem.validate')
  @ApiOperation({ summary: 'Validate a pending problem' })
  validate(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.problems.validate(user, id);
  }

  @Post(':id/reject')
  @Permissions('problem.validate')
  @ApiOperation({ summary: 'Reject a problem with a reason' })
  reject(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: RejectProblemDto,
  ) {
    return this.problems.reject(user, id, dto.reason);
  }

  @Post(':id/route')
  @Permissions('problem.route')
  @ApiOperation({ summary: 'Override the department a problem is routed to' })
  route(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: RouteProblemDto) {
    return this.problems.route(user, id, dto.departmentId, dto.reason);
  }
}
