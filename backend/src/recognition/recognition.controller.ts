import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import { RecognitionService } from './recognition.service';

/** `/api/v1/admin/recognition` — recompute on demand. */
@ApiTags('recognition')
@Controller({ path: 'admin/recognition', version: '1' })
@Surfaces('admin')
export class RecognitionController {
  constructor(private readonly recognition: RecognitionService) {}

  @Post('recompute')
  @HttpCode(200)
  @Permissions('account.verify')
  @ApiOperation({
    summary: 'Rebuild every leaderboard and re-evaluate every badge rule',
    description:
      'Runs hourly on its own. This exists so a corrected badge threshold or a late ' +
      'verification takes effect without waiting for the hour.',
  })
  recompute() {
    return this.recognition.recomputeAll();
  }

  @Get('status')
  @ApiOperation({ summary: 'When the rankings were last computed' })
  status() {
    return this.recognition.lastComputed();
  }
}
