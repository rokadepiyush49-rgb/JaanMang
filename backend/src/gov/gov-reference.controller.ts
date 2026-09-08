import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../rbac/scope.service';
import type { AuthPrincipal } from '../auth/auth.types';

/**
 * `/api/v1/gov/*` — the reference data the government workspace reads alongside
 * the problem list: departments, officers, sponsors, automations, alerts, the
 * weekly trend, and the list of government users (for the dev "view as" switch).
 *
 * These back the `list*` functions in apps/web/src/lib/gov/service.ts that are
 * not the problem list itself.
 */
@ApiTags('gov')
@Controller({ path: 'gov', version: '1' })
export class GovReferenceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  @Get('departments')
  @ApiOperation({ summary: 'Departments, their categories and budget position' })
  async departments() {
    const rows = await this.prisma.department.findMany({ orderBy: { name: 'asc' } });
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName,
      categories: d.categories,
      headOfficerId: d.headOfficerId ?? '',
      budgetAllocated: d.budgetAllocated.toNumber(),
      budgetCommitted: d.budgetCommitted.toNumber(),
      budgetSpent: d.budgetSpent.toNumber(),
      slaHours: d.slaHours,
    }));
  }

  @Get('officers')
  @ApiOperation({ summary: 'Delivery officers with rolling task load' })
  async officers() {
    const rows = await this.prisma.officer.findMany({ include: { user: true } });
    return rows.map((o) => ({
      id: o.userId,
      name: o.user.displayName,
      designation: o.designation,
      departmentId: o.departmentId,
      jurisdictionId: o.jurisdictionId,
      phone: o.phone,
      activeTasks: o.activeTasks,
      criticalTasks: o.criticalTasks,
      overdue: o.overdue,
      completionRate: o.completionRate,
      avgResolutionDays: o.avgResolutionDays,
      capacity: o.capacity,
    }));
  }

  @Get('sponsors')
  @ApiOperation({ summary: 'Industry sponsors and their CSR position' })
  async sponsors() {
    const rows = await this.prisma.sponsor.findMany({ orderBy: { name: 'asc' } });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      sector: s.sector,
      csrThemes: s.csrThemes,
      csrGeographies: s.csrGeographies,
      csrBudgetRemaining: s.csrBudgetRemaining.toNumber(),
      responseRate: s.responseRate,
    }));
  }

  @Get('automations')
  @ApiOperation({ summary: 'The automation catalogue and its recent activity' })
  async automations() {
    const rows = await this.prisma.automation.findMany({
      where: { scope: 'gov' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      status: a.status,
      enabled: a.enabled,
      lastRunAt: a.lastRunAt?.toISOString() ?? new Date(0).toISOString(),
      nextAction: a.nextAction ?? '',
      affectedRecords: a.affectedRecords,
      runsToday: a.runsToday,
    }));
  }

  @Get('alerts')
  @ApiOperation({ summary: 'The signed-in officer’s workspace alerts' })
  async alerts(@CurrentUser() user: AuthPrincipal) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      detail: n.detail,
      at: n.createdAt.toISOString(),
      problemId: n.entityType === 'problem' ? (n.entityId ?? undefined) : undefined,
      actionLabel: n.actionLabel ?? undefined,
      read: n.read,
    }));
  }

  @Get('users')
  @ApiOperation({ summary: 'Government users the caller may act as (dev "view as")' })
  async users(@CurrentUser() principal: AuthPrincipal) {
    const rows = await this.prisma.user.findMany({
      where: {
        kind: 'staff',
        roles: { some: { role: { key: { in: ['gov_panchayat', 'gov_block', 'gov_district'] } } } },
      },
      include: { roles: { include: { role: true, jurisdiction: true } } },
    });
    return rows.map((u) => {
      const govRole = u.roles.find((r) =>
        ['gov_panchayat', 'gov_block', 'gov_district'].includes(r.role.key),
      );
      return {
        id: u.id,
        name: u.displayName,
        designation: govRole?.role.label ?? 'Officer',
        level: govRole?.jurisdiction?.level ?? 'panchayat',
        jurisdictionId: govRole?.jurisdictionId ?? '',
        isSelf: u.id === principal.userId,
      };
    });
  }

  @Get('reports')
  @ApiOperation({ summary: 'Citizen reports, optionally filtered to one problem' })
  async reports(@CurrentUser() user: AuthPrincipal, @Query('problemId') problemId?: string) {
    const scopeWhere = await this.scope.jurisdictionFilter(user);
    const rows = await this.prisma.citizenReport.findMany({
      where: {
        ...(problemId ? { problemId } : {}),
        ...(scopeWhere ? { problem: scopeWhere } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      problemId: r.problemId ?? '',
      citizenName: r.citizenName,
      channel: r.channel,
      raw: r.raw,
      language: r.language,
      villageId: r.villageId,
      lat: r.lat,
      lng: r.lng,
      at: r.createdAt.toISOString(),
      photos: r.photos,
      duplicateOf: r.duplicateOfId ?? undefined,
      aiConfidence: r.aiConfidence,
    }));
  }

  @Get('analytics/weekly-trend')
  @ApiOperation({ summary: 'Twelve weeks of intake vs resolution' })
  async weeklyTrend() {
    const rows = await this.prisma.weeklyTrendPoint.findMany({ orderBy: { week: 'asc' } });
    // "W1".."W12" — sort numerically, not lexically.
    return rows
      .sort((a, b) => Number(a.week.slice(1)) - Number(b.week.slice(1)))
      .map((w) => ({
        week: w.week,
        reported: w.reported,
        resolved: w.resolved,
        priorityAvg: w.priorityAvg,
      }));
  }
}
