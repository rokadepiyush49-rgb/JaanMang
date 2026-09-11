import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { InstituteService } from './institute.service';
import {
  AssignGuideDto,
  AssignMembersDto,
  DepartmentDto,
  DepartmentPatchDto,
  FacultyCreateDto,
  FacultyPatchDto,
  ProgramDto,
  ProgramPatchDto,
  RequestChangesDto,
  ReviewDto,
  StudentPlacementDto,
  StudentQueryDto,
  TeamCreateDto,
  TeamPatchDto,
  UpdateProfileDto,
} from './institute.dto';

/**
 * `/api/v1/institute/*` — the institute workspace API.
 *
 * `@Surfaces('institute')` sits on the class, not on the routes, for the same
 * reason it does on `GovReferenceController`: an endpoint added here is closed
 * by default. It matters especially here, because almost everything this
 * controller returns is a named student — their branch, their year, their team,
 * whether their institution has confirmed them. A read that carries that must
 * never be one forgotten decorator away from being world-readable to anyone
 * holding any session.
 *
 * Reads carry no `@Permissions`: holding an institute role *is* the read
 * authority, and `InstituteService` narrows what a faculty member sees to the
 * teams they guide. Every mutation names the permission it needs, so the
 * difference between a registrar and a lecturer is enforced by the guard rather
 * than by which buttons the client chose to render.
 */
@ApiTags('institute')
@Controller({ path: 'institute', version: '1' })
@Surfaces('institute')
export class InstituteController {
  constructor(private readonly institute: InstituteService) {}

  /* ============================================================ overview === */

  @Get('overview')
  @ApiOperation({ summary: 'The institute dashboard: counts, pipeline, queues and activity' })
  async overview(@CurrentUser() user: AuthPrincipal) {
    return this.institute.overview(user, await this.institute.orgOf(user));
  }

  @Get('analytics')
  @Permissions('institute.report.view')
  @ApiOperation({ summary: 'Participation, delivery and selection analytics' })
  async analytics(@CurrentUser() user: AuthPrincipal) {
    return this.institute.analytics(user, await this.institute.orgOf(user));
  }

  /* ============================================================= profile === */

  @Get('profile')
  @ApiOperation({ summary: 'The institution profile, verification state and completion' })
  async profile(@CurrentUser() user: AuthPrincipal) {
    return this.institute.profile(await this.institute.orgOf(user));
  }

  @Patch('profile')
  @Permissions('institute.profile.manage')
  @ApiOperation({ summary: 'Update the institution profile' })
  async updateProfile(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateProfileDto) {
    return this.institute.updateProfile(await this.institute.orgOf(user), dto);
  }

  /* ========================================================= departments === */

  @Get('departments')
  @ApiOperation({ summary: 'Academic departments with their programmes and live counts' })
  async departments(@CurrentUser() user: AuthPrincipal) {
    return this.institute.departments(await this.institute.orgOf(user));
  }

  @Post('departments')
  @HttpCode(201)
  @Permissions('institute.profile.manage')
  @ApiOperation({ summary: 'Create an academic department' })
  async createDepartment(@CurrentUser() user: AuthPrincipal, @Body() dto: DepartmentDto) {
    return this.institute.createDepartment(await this.institute.orgOf(user), dto);
  }

  @Patch('departments/:id')
  @Permissions('institute.profile.manage')
  @ApiOperation({ summary: 'Update a department' })
  async updateDepartment(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: DepartmentPatchDto,
  ) {
    return this.institute.updateDepartment(await this.institute.orgOf(user), id, dto);
  }

  @Delete('departments/:id')
  @Permissions('institute.profile.manage')
  @ApiOperation({ summary: 'Archive a department that has no active teams' })
  async deleteDepartment(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.institute.deleteDepartment(await this.institute.orgOf(user), id);
  }

  /* ============================================================ programs === */

  @Post('programs')
  @HttpCode(201)
  @Permissions('institute.profile.manage')
  @ApiOperation({ summary: 'Create a programme under a department' })
  async createProgram(@CurrentUser() user: AuthPrincipal, @Body() dto: ProgramDto) {
    return this.institute.createProgram(await this.institute.orgOf(user), dto);
  }

  @Patch('programs/:id')
  @Permissions('institute.profile.manage')
  @ApiOperation({ summary: 'Update a programme' })
  async updateProgram(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: ProgramPatchDto,
  ) {
    return this.institute.updateProgram(await this.institute.orgOf(user), id, dto);
  }

  @Delete('programs/:id')
  @Permissions('institute.profile.manage')
  @ApiOperation({ summary: 'Archive a programme' })
  async deleteProgram(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.institute.deleteProgram(await this.institute.orgOf(user), id);
  }

  /* ============================================================ students === */

  @Get('students')
  @ApiOperation({ summary: 'The student roster, filterable by department, year and status' })
  async students(@CurrentUser() user: AuthPrincipal, @Query() query: StudentQueryDto) {
    return this.institute.students(await this.institute.orgOf(user), query);
  }

  @Patch('students/:userId')
  @Permissions('institute.student.manage')
  @ApiOperation({ summary: 'Place a student in a department or programme, or verify them' })
  async placeStudent(
    @CurrentUser() user: AuthPrincipal,
    @Param('userId') userId: string,
    @Body() dto: StudentPlacementDto,
  ) {
    return this.institute.placeStudent(await this.institute.orgOf(user), user.userId, userId, dto);
  }

  /* ============================================================= faculty === */

  @Get('faculty')
  @ApiOperation({ summary: 'Faculty with their department, expertise and current guiding load' })
  async faculty(@CurrentUser() user: AuthPrincipal) {
    return this.institute.faculty(await this.institute.orgOf(user));
  }

  @Post('faculty')
  @HttpCode(201)
  @Permissions('institute.faculty.manage')
  @ApiOperation({ summary: 'Create a faculty account at this institution' })
  async createFaculty(@CurrentUser() user: AuthPrincipal, @Body() dto: FacultyCreateDto) {
    return this.institute.createFaculty(await this.institute.orgOf(user), dto);
  }

  @Patch('faculty/:userId')
  @Permissions('institute.faculty.manage')
  @ApiOperation({ summary: 'Update a faculty member’s department, expertise or capacity' })
  async updateFaculty(
    @CurrentUser() user: AuthPrincipal,
    @Param('userId') userId: string,
    @Body() dto: FacultyPatchDto,
  ) {
    return this.institute.updateFaculty(await this.institute.orgOf(user), userId, dto);
  }

  @Delete('faculty/:userId')
  @Permissions('institute.faculty.manage')
  @ApiOperation({ summary: 'Remove a faculty member from this institution' })
  async removeFaculty(@CurrentUser() user: AuthPrincipal, @Param('userId') userId: string) {
    return this.institute.removeFaculty(await this.institute.orgOf(user), userId);
  }

  /* =============================================================== teams === */

  @Get('teams')
  @ApiOperation({ summary: 'Student teams — every team for a registrar, own teams for a guide' })
  async teams(@CurrentUser() user: AuthPrincipal) {
    return this.institute.teams(user, await this.institute.orgOf(user));
  }

  @Get('teams/:id')
  @ApiOperation({ summary: 'One team with its members, guide, project and applications' })
  async team(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.institute.team(user, await this.institute.orgOf(user), id);
  }

  @Post('teams')
  @HttpCode(201)
  @Permissions('institute.team.manage')
  @ApiOperation({ summary: 'Form a team' })
  async createTeam(@CurrentUser() user: AuthPrincipal, @Body() dto: TeamCreateDto) {
    return this.institute.createTeam(await this.institute.orgOf(user), dto);
  }

  @Patch('teams/:id')
  @Permissions('institute.team.manage')
  @ApiOperation({ summary: 'Update a team’s brief, stage or status' })
  async updateTeam(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: TeamPatchDto,
  ) {
    return this.institute.updateTeam(user, await this.institute.orgOf(user), id, dto);
  }

  @Post('teams/:id/guide')
  @HttpCode(200)
  @Permissions('institute.team.manage')
  @ApiOperation({ summary: 'Assign or clear the faculty guide for a team' })
  async assignGuide(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: AssignGuideDto,
  ) {
    return this.institute.assignGuide(user, await this.institute.orgOf(user), id, dto);
  }

  @Post('teams/:id/members')
  @HttpCode(200)
  @Permissions('institute.team.manage')
  @ApiOperation({ summary: 'Assign students to a team' })
  async addMembers(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: AssignMembersDto,
  ) {
    return this.institute.addMembers(user, await this.institute.orgOf(user), id, dto);
  }

  @Delete('teams/:id/members/:userId')
  @Permissions('institute.team.manage')
  @ApiOperation({ summary: 'Remove a student from a team' })
  async removeMember(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.institute.removeMember(user, await this.institute.orgOf(user), id, userId);
  }

  /* ============================================================ projects === */

  @Get('projects')
  @ApiOperation({ summary: 'Projects the institution is carrying, with milestone state' })
  async projects(@CurrentUser() user: AuthPrincipal) {
    return this.institute.projects(user, await this.institute.orgOf(user));
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'One project end to end' })
  async project(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.institute.project(user, await this.institute.orgOf(user), id);
  }

  /* ========================================================= submissions === */

  @Get('submissions')
  @ApiOperation({ summary: 'Milestones submitted by teams and awaiting a decision' })
  async submissions(@CurrentUser() user: AuthPrincipal) {
    return this.institute.submissions(user, await this.institute.orgOf(user));
  }

  @Post('submissions/:id/approve')
  @HttpCode(200)
  @Permissions('institute.submission.review')
  @ApiOperation({ summary: 'Approve a submitted milestone' })
  async approve(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: ReviewDto,
  ) {
    return this.institute.decideSubmission(
      user,
      await this.institute.orgOf(user),
      id,
      'approve',
      dto.note,
    );
  }

  @Post('submissions/:id/request-changes')
  @HttpCode(200)
  @Permissions('institute.submission.review')
  @ApiOperation({ summary: 'Return a submitted milestone to the team with a reason' })
  async requestChanges(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: RequestChangesDto,
  ) {
    return this.institute.decideSubmission(
      user,
      await this.institute.orgOf(user),
      id,
      'changes',
      dto.note,
    );
  }

  /* ======================================================== applications === */

  @Get('applications')
  @ApiOperation({ summary: 'Applications by this institution’s students and teams' })
  async applications(@CurrentUser() user: AuthPrincipal) {
    return this.institute.applications(await this.institute.orgOf(user));
  }

  /* ======================================================= opportunities === */

  @Get('opportunities')
  @ApiOperation({ summary: 'Validated citizen problems open to a student team (redacted)' })
  async opportunities(@CurrentUser() user: AuthPrincipal) {
    return this.institute.opportunities(await this.institute.orgOf(user));
  }

  @Get('partners')
  @ApiOperation({ summary: 'Industry partners, and which of them already carry our work' })
  async partners(@CurrentUser() user: AuthPrincipal) {
    return this.institute.partners(await this.institute.orgOf(user));
  }

  /* ======================================================= notifications === */

  @Get('notifications')
  @ApiOperation({ summary: 'This account’s notifications' })
  notifications(@CurrentUser() user: AuthPrincipal) {
    return this.institute.notifications(user);
  }

  @Post('notifications/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark every notification read' })
  markRead(@CurrentUser() user: AuthPrincipal) {
    return this.institute.markNotificationsRead(user);
  }
}
