import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness and readiness. Kept dependency-light on purpose — a deploy platform
 * polls these every few seconds.
 *
 *   /healthz  the process is up (always 200 if it can answer)
 *   /readyz   the process can serve traffic (checks the database)
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('healthz')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }

  @Public()
  @Get('readyz')
  @ApiOperation({ summary: 'Readiness probe — verifies the database is reachable' })
  async readiness() {
    const dbOk = await this.prisma.isHealthy();
    if (!dbOk) {
      throw new ServiceUnavailableException({ status: 'degraded', database: 'unreachable' });
    }
    return { status: 'ok', database: 'ok' };
  }
}
