import { Body, Controller, HttpCode, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { DeliveryService } from './delivery.service';
import { AssignOfficerDto, AutomationToggleDto, ProjectProgressDto } from './delivery.dto';

/** `/api/v1/problems/:id/*` — assignment and delivery. */
@ApiTags('delivery')
@Controller({ path: 'problems', version: '1' })
@Surfaces('gov')
@UseInterceptors(IdempotencyInterceptor)
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post(':id/assign')
  @HttpCode(200)
  @Permissions('officer.assign')
  @ApiOperation({ summary: 'Assign or reassign the delivery officer' })
  assign(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: AssignOfficerDto,
  ) {
    return this.delivery.assign(user, id, dto);
  }

  @Post(':id/project/progress')
  @HttpCode(200)
  @Permissions('project.update')
  @ApiOperation({ summary: 'Update project progress' })
  progress(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: ProjectProgressDto,
  ) {
    return this.delivery.progress(user, id, dto);
  }

  @Post(':id/project/complete')
  @HttpCode(200)
  @Permissions('project.update')
  @ApiOperation({
    summary: 'Mark the project complete and ask the citizens who reported it',
    description:
      'Does not resolve the problem. It raises the verification request addressed to the ' +
      'reporters; they decide whether it was fixed.',
  })
  complete(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.delivery.complete(user, id);
  }
}

/** `/api/v1/automations/*` and `/api/v1/alerts/*` — the workspace's own state. */
@ApiTags('delivery')
@Controller({ version: '1' })
@Surfaces('gov')
export class WorkspaceController {
  constructor(private readonly delivery: DeliveryService) {}

  @Patch('automations/:id')
  @Permissions('settings.manage')
  @ApiOperation({ summary: 'Enable or pause an automation' })
  toggle(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: AutomationToggleDto,
  ) {
    return this.delivery.toggleAutomation(user, id, dto);
  }

  @Post('alerts/:id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one of your own alerts read' })
  read(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.delivery.markAlertRead(user, id);
  }
}
