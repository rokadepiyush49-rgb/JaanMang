import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `/api/v1/geography` — the administrative tree and the village register.
 *
 * Both are reference data every `/gov` screen needs (the map, the jurisdiction
 * breadcrumb, the deprivation index). Readable by any authenticated user; not
 * jurisdiction-scoped — the tree itself is public.
 */
@ApiTags('geography')
@Controller({ path: 'geography', version: '1' })
export class GeographyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('jurisdictions')
  @ApiOperation({ summary: 'The full administrative tree' })
  async jurisdictions() {
    const rows = await this.prisma.jurisdiction.findMany({ orderBy: { name: 'asc' } });
    return rows.map((j) => ({
      id: j.id,
      level: j.level,
      name: j.name,
      parentId: j.parentId ?? undefined,
      population: j.population,
    }));
  }

  @Get('villages')
  @ApiOperation({ summary: 'The village register with population and deprivation index' })
  async villages() {
    const rows = await this.prisma.village.findMany({ orderBy: { name: 'asc' } });
    return rows.map((v) => ({
      id: v.id,
      name: v.name,
      jurisdictionId: v.jurisdictionId,
      population: v.population,
      deprivation: v.deprivation,
      lat: v.lat,
      lng: v.lng,
    }));
  }
}
