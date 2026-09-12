import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { IndustryService } from './industry.service';
import { IndustryEngagementService } from './industry-engagement.service';
import {
  AssignMentorDto,
  ChallengeQueryDto,
  CommitDto,
  CsrQueryDto,
  PostMessageDto,
  TalentQueryDto,
  UpdateCompanyDto,
} from './industry.dto';

/**
 * `/api/v1/industry/*` — the partner portal.
 *
 * `@Surfaces('industry')` sits on the class so a route added here is closed by
 * default, which matters more on this controller than any other: almost
 * everything it touches is derived from a citizen's problem, and the difference
 * between what a partner may see and what the government holds is a projection
 * one forgotten decorator away from being skipped.
 *
 * Reads carry no `@Permissions`: holding an industry role is the read
 * authority, and the service narrows what the company sees to its own rows.
 * Every mutation names the permission it needs.
 */
@ApiTags('industry')
@Controller({ path: 'industry', version: '1' })
@Surfaces('industry')
export class IndustryController {
  constructor(
    private readonly industry: IndustryService,
    private readonly engagement: IndustryEngagementService,
  ) {}

  /* ------------------------------------------------------------- company */

  @Get('profile')
  @ApiOperation({ summary: 'The company profile the match engine reads' })
  async profile(@CurrentUser() user: AuthPrincipal) {
    return this.industry.profile(await this.industry.orgOf(user));
  }

  @Patch('profile')
  @Permissions('industry.profile.manage')
  @ApiOperation({ summary: 'Update the company profile' })
  async updateProfile(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateCompanyDto) {
    return this.industry.updateProfile(await this.industry.orgOf(user), { ...dto });
  }

  /* ---------------------------------------------------------- challenges */

  @Get('challenges')
  @ApiOperation({
    summary: 'Validated citizen problems, in the redacted partner shape',
    description:
      'Only problems the government has validated, and only ever through the redaction ' +
      'projection. Citizen names, phone numbers, verbatim reports and household coordinates ' +
      'are not in the response shape at all.',
  })
  challenges(@Query() query: ChallengeQueryDto) {
    return this.industry.challenges(query);
  }

  @Get('challenges/:id')
  @ApiOperation({ summary: 'One challenge' })
  challenge(@Param('id') id: string) {
    return this.industry.challenge(id);
  }

  @Get('challenges/:id/timeline')
  @ApiOperation({
    summary: 'The public audit trail',
    description:
      'Citizen entries collapse into a count and officer entries into an office. "43 people ' +
      'reported this" carries the weight without naming any of them.',
  })
  timeline(@Param('id') id: string) {
    return this.industry.timeline(id);
  }

  @Get('visibility-policy')
  @ApiOperation({
    summary: 'What partners can and cannot see',
    description:
      'Published because the portal shows it. A partner who can see exactly where the line is ' +
      'drawn trusts the data on their side of it more, not less.',
  })
  visibilityPolicy() {
    return this.industry.visibilityPolicy();
  }

  /* -------------------------------------------------------------- match */

  @Get('matches')
  @ApiOperation({ summary: 'Every challenge scored against this company, best first' })
  async matches(@CurrentUser() user: AuthPrincipal) {
    return this.industry.matches(await this.industry.orgOf(user));
  }

  @Get('challenges/:id/match')
  @ApiOperation({ summary: 'The five-factor decomposition for one challenge' })
  async matchOne(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.industry.matchOne(await this.industry.orgOf(user), id);
  }

  /* --------------------------------------------------------------- CSR */

  @Get('csr')
  @ApiOperation({ summary: 'The CSR position for a financial year, and the benefits behind it' })
  async csr(@CurrentUser() user: AuthPrincipal, @Query() query: CsrQueryDto) {
    return this.engagement.csrPosition(await this.industry.orgOf(user), query.financialYear);
  }

  /* -------------------------------------------------------- commitments */

  @Get('commitments')
  @ApiOperation({ summary: 'Every challenge this company has approached' })
  async commitments(@CurrentUser() user: AuthPrincipal) {
    return this.engagement.commitments(await this.industry.orgOf(user));
  }

  @Post('challenges/:id/commit')
  @HttpCode(200)
  @Permissions('industry.funding.commit')
  @ApiOperation({
    summary: 'Express interest in a challenge, or put a number on it',
    description:
      "Writes the same SponsorshipMatch row the government's sponsorship tab reads, so interest " +
      "lands in the officer's queue. It approves nothing — acceptance is the government's " +
      'decision, and the platform moves no money.',
  })
  async commit(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: CommitDto,
  ) {
    return this.engagement.commit(await this.industry.orgOf(user), id, dto);
  }

  /* --------------------------------------------------------- mentorship */

  @Get('mentorship/requests')
  @ApiOperation({ summary: 'Teams asking for a mentor' })
  mentorshipRequests() {
    return this.engagement.mentorshipRequests();
  }

  @Get('mentorship/assignments')
  @ApiOperation({ summary: "Assignments this company's people hold" })
  async mentorAssignments(@CurrentUser() user: AuthPrincipal) {
    return this.engagement.mentorAssignments(await this.industry.orgOf(user));
  }

  @Post('mentorship/requests/:id/assign')
  @HttpCode(201)
  @Permissions('industry.mentorship.assign')
  @ApiOperation({ summary: 'Offer yourself as a mentor to this team' })
  async assignMentor(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: AssignMentorDto,
  ) {
    return this.engagement.assignMentor(user, await this.industry.orgOf(user), id, dto.roles);
  }

  /* ------------------------------------------------------------ messages */

  @Get('messages')
  @ApiOperation({ summary: 'Threads this company participates in' })
  async threads(@CurrentUser() user: AuthPrincipal) {
    return this.engagement.threads(await this.industry.orgOf(user), user);
  }

  @Post('messages/:id')
  @HttpCode(201)
  @Permissions('industry.messages.post')
  @ApiOperation({ summary: 'Post to a thread you participate in' })
  async postMessage(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.engagement.postMessage(await this.industry.orgOf(user), user, id, dto.body);
  }

  /* -------------------------------------------------------------- talent */

  @Get('talent')
  @ApiOperation({
    summary: 'Student teams, narrowed to first name, year and discipline',
    description:
      'Enough to hold a design review, not enough to approach somebody off-platform. Surnames, ' +
      'enrolment numbers, email addresses and marks are in the same table and are never selected.',
  })
  talent(@Query() query: TalentQueryDto) {
    return this.engagement.talent(query);
  }

  @Get('universities')
  @ApiOperation({ summary: 'Institutions on the register' })
  universities() {
    return this.engagement.universities();
  }

  /* ------------------------------------------------------- notifications */

  @Get('notifications')
  @ApiOperation({ summary: 'Your alerts' })
  notifications(@CurrentUser() user: AuthPrincipal) {
    return this.engagement.notifications(user);
  }
}
