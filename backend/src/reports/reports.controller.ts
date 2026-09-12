import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { ReportsService } from './reports.service';
import { CreateReportDto, MyReportsQueryDto } from './reports.dto';

/**
 * 20 reports/hour per address, effectively off under test.
 *
 * The bucket is per-hour rather than per-minute because the abuse this guards
 * against is a script filing a thousand reports to move a ranking, not a person
 * clicking twice — and because a village meeting where fifteen people file the
 * same complaint from one shared phone is a thing that should work. The
 * `Idempotency-Key` handles the double-tap; this handles the flood.
 */
const INTAKE_THROTTLE = {
  default: { ttl: 3_600_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 20 },
};

/**
 * `/api/v1/reports` — the head of the loop.
 *
 * Intake is `@Public()` and that is a decision, not an oversight. Requiring an
 * account to report a broken handpump filters for exactly the people who least
 * need the platform: the report is the product's most valuable input and its
 * lowest-trust one, so it is open, rate-limited, and everything downstream
 * treats it as a claim rather than a fact.
 */
@ApiTags('reports')
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @Public()
  @HttpCode(201)
  @Throttle(INTAKE_THROTTLE)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'A client-generated UUID. Send the same key when retrying and the report is filed once, ' +
      'however many times a flaky connection delivers the request.',
  })
  @ApiOperation({
    summary: 'File a citizen report',
    description:
      'Open to anyone. The village is resolved from the coordinates, the text is classified by ' +
      'the intake pass (a hosted model when one is configured, a deterministic keyword pass ' +
      'otherwise), and clustering attaches the report to a problem on its next run.',
  })
  async create(@Body() dto: CreateReportDto, @CurrentUser() user?: AuthPrincipal) {
    return this.reports.create(dto, user);
  }

  @Get('mine')
  @ApiOperation({
    summary: "A citizen's own reports and what became of each",
  })
  async mine(@CurrentUser() user: AuthPrincipal, @Query() query: MyReportsQueryDto) {
    return this.reports.mine(user, query);
  }
}

/**
 * `/api/v1/problems/:id/vote`.
 *
 * A second controller on the `problems` path rather than a route on
 * `ProblemsController`, because that one is `@Surfaces('gov')` — the officer's
 * view of the register — and voting is the opposite: any signed-in citizen, on
 * any surface. Merging them would mean weakening the guard on eleven government
 * endpoints to add one citizen endpoint.
 */
@ApiTags('reports')
@Controller({ path: 'problems', version: '1' })
export class ProblemVotesController {
  constructor(private readonly reports: ReportsService) {}

  @Post(':id/vote')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Vote that a problem matters',
    description:
      'Distinct from filing a report. A report says "I have this problem"; a vote says ' +
      '"I agree this matters". They are weighted separately by the priority engine. ' +
      'Voting twice is not an error and changes nothing.',
  })
  async vote(@Param('id') id: string, @CurrentUser() user: AuthPrincipal) {
    return this.reports.vote(id, user);
  }

  @Delete(':id/vote')
  @HttpCode(200)
  @ApiOperation({ summary: 'Withdraw a vote' })
  async unvote(@Param('id') id: string, @CurrentUser() user: AuthPrincipal) {
    return this.reports.unvote(id, user);
  }
}
