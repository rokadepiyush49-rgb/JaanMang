import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { StudentService } from './student.service';
import { StudentCollabService } from './student-collab.service';
import {
  ApplyDto,
  EnterHackathonDto,
  OpportunityQueryDto,
  ProposeDto,
  RecommendationQueryDto,
  UpdateStudentProfileDto,
} from './student.dto';

/**
 * `/api/v1/student/*` — the student workspace.
 *
 * `@Surfaces('student')` on the class. Reads carry no `@Permissions`: holding a
 * student role is the read authority, and every method narrows to the caller's
 * own rows. Mutations name the permission they need.
 */
@ApiTags('student')
@Controller({ path: 'student', version: '1' })
@Surfaces('student')
export class StudentController {
  constructor(
    private readonly student: StudentService,
    private readonly collab: StudentCollabService,
  ) {}

  /* ------------------------------------------------------------- profile */

  @Get('profile')
  @ApiOperation({ summary: 'The signed-in student’s own profile' })
  profile(@CurrentUser() user: AuthPrincipal) {
    return this.student.profile(user);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update the parts of the profile a student owns',
    description:
      'Skills, interests, preferences and links. Not branch, year, institution, department or ' +
      'verification — those are facts the institution asserted, and this endpoint has no field ' +
      'for them.',
  })
  updateProfile(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateStudentProfileDto) {
    return this.student.updateProfile(user, { ...dto });
  }

  /* ------------------------------------------------------- opportunities */

  @Get('opportunities')
  @ApiOperation({
    summary: 'Published problems a student can work on',
    description:
      'Carries a difficulty signal derived from severity and the number of technologies a brief ' +
      'names, so a second-year has somewhere to start rather than a list headed by the hardest ' +
      'problem in the district.',
  })
  opportunities(@CurrentUser() user: AuthPrincipal, @Query() query: OpportunityQueryDto) {
    return this.student.opportunities(user, query);
  }

  @Get('recommendations')
  @ApiOperation({
    summary: 'Ranked suggestions, each with the reasons that produced it',
    description:
      'Scored by the heuristic recommender, or by the external skill-map model when ' +
      'RECOMMENDER_URL is set. A recommendation without a reason is never returned by either.',
  })
  recommendations(@CurrentUser() user: AuthPrincipal, @Query() query: RecommendationQueryDto) {
    return this.student.recommendations(user, query.limit);
  }

  /* --------------------------------------------------------- applications */

  @Get('applications')
  @ApiOperation({ summary: 'Your applications and where each one stands' })
  applications(@CurrentUser() user: AuthPrincipal) {
    return this.student.applications(user);
  }

  @Post('opportunities/:id/apply')
  @HttpCode(201)
  @Permissions('student.application.submit')
  @ApiOperation({
    summary: 'Apply to an opportunity',
    description:
      "Writes the same Application row the institute's submissions queue reads — one record, two " +
      'views, rather than two tables that can disagree about who applied to what.',
  })
  apply(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: ApplyDto) {
    return this.student.apply(user, id, dto);
  }

  @Delete('applications/:id')
  @Permissions('student.application.submit')
  @ApiOperation({ summary: 'Withdraw an application' })
  withdraw(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.student.withdraw(user, id);
  }

  /* ------------------------------------------------- projects & progress */

  @Get('projects')
  @ApiOperation({ summary: 'Projects your teams are carrying' })
  projects(@CurrentUser() user: AuthPrincipal) {
    return this.student.projects(user);
  }

  @Get('teams')
  @ApiOperation({ summary: 'Teams you are in' })
  teams(@CurrentUser() user: AuthPrincipal) {
    return this.collab.myTeams(user);
  }

  /* -------------------------------------------------------- achievements */

  @Get('achievements')
  @ApiOperation({
    summary: 'Points, badges and awards',
    description:
      'All derived — points from verified work, badges from the recognition rules, awards from a ' +
      'person. Nothing here moves in response to anything the client sends.',
  })
  achievements(@CurrentUser() user: AuthPrincipal) {
    return this.student.achievements(user);
  }

  /* ------------------------------------------------------- notifications */

  @Get('notifications')
  @ApiOperation({ summary: 'Your notifications' })
  notifications(@CurrentUser() user: AuthPrincipal) {
    return this.student.notifications(user);
  }

  @Post('notifications/:id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one of your own notifications read' })
  readNotification(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.student.markNotificationRead(user, id);
  }

  /* ----------------------------------------------- open innovation */

  @Get('proposals')
  @ApiOperation({ summary: "Your institution's unprompted solution proposals" })
  proposals(@CurrentUser() user: AuthPrincipal) {
    return this.collab.proposals(user);
  }

  @Post('proposals')
  @HttpCode(201)
  @Permissions('student.project.create')
  @ApiOperation({
    summary: 'Propose a solution to a problem nobody asked you to solve',
    description:
      'The inverse of an application: an application answers a brief somebody else wrote, a ' +
      'proposal writes the brief.',
  })
  propose(@CurrentUser() user: AuthPrincipal, @Body() dto: ProposeDto) {
    return this.collab.propose(user, dto);
  }

  /* ----------------------------------------------------------- hackathons */

  @Get('hackathons')
  @ApiOperation({ summary: 'Hackathons, and where your teams stand in them' })
  hackathons(@CurrentUser() user: AuthPrincipal) {
    return this.collab.hackathons(user);
  }

  @Post('hackathons/:id/enter')
  @HttpCode(200)
  @Permissions('student.team.manage')
  @ApiOperation({ summary: 'Enter one of your teams' })
  enterHackathon(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: EnterHackathonDto,
  ) {
    return this.collab.enterHackathon(user, id, dto.teamId);
  }
}
