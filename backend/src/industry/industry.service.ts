import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProblemException } from '../common/errors/problem';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  CATEGORY_DOMAIN,
  PUBLISHABLE_WHERE,
  REDACTIONS,
  publicTimeline,
  toChallenge,
  type ChallengeSource,
} from './visibility';
import {
  matchChallenge,
  type MatchResult,
  type MatchableChallenge,
  type MatchableCompany,
} from './match.engine';

/**
 * Everything the `/industry` portal reads and writes.
 *
 * One rule governs the whole file: **no method returns a government row.**
 * Every challenge leaves through `toChallenge`, every query starts from
 * `PUBLISHABLE_WHERE`, and every student or citizen shape is assembled field by
 * field rather than spread from a record. The portal was eighteen screens over
 * fixtures, and the reason connecting it is delicate is that the fixtures were
 * already redacted — the database is not.
 */
@Injectable()
export class IndustryService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------------------- company */

  /**
   * The organisation this session acts for.
   *
   * Resolved from the session, never from a parameter. A body or query that
   * could name the company is one that could name somebody else's, and every
   * CSR figure in this portal is commercially sensitive.
   */
  async orgOf(principal: AuthPrincipal): Promise<string> {
    if (principal.orgIds.length === 0) {
      throw ProblemException.forbidden('This account is not attached to a company.');
    }
    const org = await this.prisma.organization.findFirst({
      where: { id: { in: principal.orgIds }, type: 'industry', deletedAt: null },
      select: { id: true },
    });
    if (!org) throw ProblemException.forbidden('This account is not attached to a company.');
    return org.id;
  }

  async profile(orgId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: {
        industryInfo: true,
        locations: true,
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                // How many teams they are already carrying, so a screen can
                // avoid offering an engineer who has no room left.
                _count: { select: { teamMemberships: true } },
              },
            },
          },
        },
      },
    });
    const info = org.industryInfo;
    if (!info) {
      throw ProblemException.invalidState(
        'This company has not finished onboarding, so there is no CSR profile to read yet.',
      );
    }

    return {
      id: org.id,
      name: org.name,
      legalName: org.legalName ?? org.name,
      sector: info.sector,
      about: org.about ?? '',
      website: info.website ?? undefined,
      orgSize: info.orgSize,
      yearEstablished: info.yearEstablished ?? undefined,
      employeeCount: info.employeeCount ?? undefined,
      csrThemes: info.csrThemes,
      geographies: info.geographies,
      technologyDomains: info.technologyDomains,
      capabilities: info.capabilities,
      sdgPreferences: info.sdgPreferences,
      provenDomains: info.provenDomains,
      fundingRange: { min: Number(info.fundingMin), max: Number(info.fundingMax) },

      /**
       * `disbursed` is deliberately 0 here rather than a figure.
       *
       * The platform moves no money, so nothing has been disbursed *through*
       * it. Reporting the committed amount as disbursed would be the single
       * most misleading number this portal could print.
       */
      csrBudget: {
        financialYear: info.csrFinancialYear ?? currentFinancialYear(),
        allocated: Number(info.csrAllocated ?? 0),
        committedElsewhere: Number(info.csrCommittedElsewhere),
        disbursed: 0,
        allocation: Array.isArray(info.csrAllocation) ? info.csrAllocation : [],
        preferredProjectCeiling: Number(info.csrPreferredCeiling ?? 0),
      },

      /**
       * The people in this organisation who have said they will mentor.
       *
       * The business unit and the designation cross; personal contact details
       * do not, even though they sit on the same row — this profile is shown to
       * universities and to student teams.
       */
      mentors: org.memberships
        .filter((m) => m.mentorRoles.length > 0)
        .map((m) => ({
          id: m.user.id,
          name: m.user.displayName,
          title: m.designation,
          unit: org.name,
          roles: m.mentorRoles,
          hoursPerMonth: m.mentorHoursPerMonth ?? 0,
          activeTeams: m.user._count.teamMemberships,
          languages: m.languages,
        })),

      headquarters: org.locations.find((l) => l.kind === 'headquarters')?.city ?? '',
      employees: info.employeeCount ?? 0,
      targetCommunities: info.geographies,
      locations: org.locations.map((l) => ({
        id: l.id,
        kind: l.kind,
        city: l.city,
        state: l.state,
      })),
      onboardedAt: info.onboardedAt?.toISOString() ?? null,
    };
  }

  async updateProfile(orgId: string, patch: Record<string, unknown>) {
    const industry: Prisma.IndustryProfileUpdateInput = {};
    const organization: Prisma.OrganizationUpdateInput = {};

    if (Array.isArray(patch.csrThemes)) industry.csrThemes = patch.csrThemes as string[];
    if (Array.isArray(patch.geographies)) industry.geographies = patch.geographies as string[];
    if (Array.isArray(patch.technologyDomains))
      industry.technologyDomains = patch.technologyDomains as string[];
    if (Array.isArray(patch.capabilities)) industry.capabilities = patch.capabilities as string[];
    if (Array.isArray(patch.sdgPreferences))
      industry.sdgPreferences = patch.sdgPreferences as number[];
    if (typeof patch.sector === 'string') industry.sector = patch.sector;
    if (typeof patch.website === 'string') industry.website = patch.website;
    if (typeof patch.about === 'string') organization.about = patch.about;
    if (typeof patch.fundingMin === 'number') industry.fundingMin = patch.fundingMin;
    if (typeof patch.fundingMax === 'number') industry.fundingMax = patch.fundingMax;
    if (typeof patch.csrAllocated === 'number') industry.csrAllocated = patch.csrAllocated;
    if (typeof patch.csrPreferredCeiling === 'number')
      industry.csrPreferredCeiling = patch.csrPreferredCeiling;
    if (typeof patch.csrFinancialYear === 'string')
      industry.csrFinancialYear = patch.csrFinancialYear;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(organization).length > 0) {
        await tx.organization.update({ where: { id: orgId }, data: organization });
      }
      if (Object.keys(industry).length > 0) {
        await tx.industryProfile.update({ where: { orgId }, data: industry });
      }
    });

    return this.profile(orgId);
  }

  /* ---------------------------------------------------------- challenges */

  /**
   * Every challenge a partner may see.
   *
   * The `where` is `PUBLISHABLE_WHERE` and nothing may widen it. The projection
   * is `toChallenge` and nothing may bypass it.
   */
  async challenges(filters: { domain?: string; state?: string; sdg?: number } = {}) {
    const rows = await this.prisma.problem.findMany({
      where: PUBLISHABLE_WHERE,
      include: CHALLENGE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });

    const chains = await this.jurisdictionChains(rows.map((r) => r.jurisdictionId));
    const challenges = rows.map((r) => toChallenge(this.asSource(r, chains)));

    return challenges.filter((c) => {
      if (filters.domain && c.domain !== filters.domain) return false;
      if (filters.state && c.state !== filters.state) return false;
      if (filters.sdg && !(c.sdgs as number[]).includes(filters.sdg)) return false;
      return true;
    });
  }

  async challenge(id: string) {
    // The id is checked against PUBLISHABLE_WHERE, not fetched and then
    // filtered. Asking for an unvalidated problem by id must be a 404, not a
    // redacted 200 that confirms it exists.
    const row = await this.prisma.problem.findFirst({
      where: { ...PUBLISHABLE_WHERE, id },
      include: CHALLENGE_INCLUDE,
    });
    if (!row) throw ProblemException.notFound('No such challenge.');

    const chains = await this.jurisdictionChains([row.jurisdictionId]);
    return toChallenge(this.asSource(row, chains));
  }

  /** The public audit trail, stripped of citizen and officer identity. */
  async timeline(id: string) {
    const problem = await this.prisma.problem.findFirst({
      where: { ...PUBLISHABLE_WHERE, id },
      select: {
        id: true,
        reportCount: true,
        duplicateCount: true,
        jurisdiction: { select: { name: true, level: true } },
        audit: { orderBy: { at: 'asc' } },
      },
    });
    if (!problem) throw ProblemException.notFound('No such challenge.');

    return publicTimeline(problem.audit, {
      problemId: problem.id,
      reportCount: problem.reportCount,
      duplicateCount: problem.duplicateCount,
      officeLabel:
        problem.jurisdiction.level === 'panchayat'
          ? 'Gram panchayat administration'
          : 'District administration',
    });
  }

  /** The redaction policy itself, so a partner can see where the line is. */
  visibilityPolicy() {
    return REDACTIONS;
  }

  /* -------------------------------------------------------------- match */

  /** Score one challenge against the calling company. */
  async matchOne(orgId: string, challengeId: string): Promise<MatchResult> {
    const [challenge, company] = await Promise.all([
      this.challenge(challengeId),
      this.matchableCompany(orgId),
    ]);
    return matchChallenge(asMatchable(challenge), company);
  }

  /** Every challenge, scored and ranked for the calling company. */
  async matches(orgId: string) {
    const [challenges, company] = await Promise.all([
      this.challenges(),
      this.matchableCompany(orgId),
    ]);

    return challenges
      .map((c) => ({ challenge: c, match: matchChallenge(asMatchable(c), company) }))
      .sort((a, b) => b.match.score - a.match.score);
  }

  /**
   * Recompute and persist `SponsorshipMatch` for a problem.
   *
   * This is the government's side of the same arithmetic: which partners the
   * officer should invite. The reasons are stored, not recomputed on read,
   * because an officer opening the sponsorship tab six months later needs the
   * reasoning that applied when the invitation went out — not the reasoning
   * that would apply against a profile the company has since edited.
   */
  async refreshMatches(problemId: string): Promise<number> {
    const challenge = await this.challenge(problemId);
    const sponsors = await this.prisma.sponsor.findMany({
      include: { org: { include: { industryInfo: true } } },
    });

    let written = 0;
    for (const sponsor of sponsors) {
      const info = sponsor.org?.industryInfo;
      const company: MatchableCompany = {
        csrThemes: info?.csrThemes ?? sponsor.csrThemes,
        geographies: info?.geographies ?? sponsor.csrGeographies,
        technologyDomains: info?.technologyDomains ?? [],
        capabilities: info?.capabilities ?? [],
        sdgPreferences: info?.sdgPreferences ?? [],
        provenDomains: info?.provenDomains ?? [],
        fundingMin: Number(info?.fundingMin ?? 0),
        fundingMax: Number(info?.fundingMax ?? sponsor.csrBudgetRemaining),
        financialYear: info?.csrFinancialYear ?? currentFinancialYear(),
      };

      const result = matchChallenge(asMatchable(challenge), company);

      await this.prisma.sponsorshipMatch.upsert({
        where: { problemId_sponsorId: { problemId, sponsorId: sponsor.id } },
        // An invitation already sent is not re-scored into a different state:
        // only the score and the reasoning are refreshed, never the status.
        update: { score: result.score, reasons: result.reasons },
        create: {
          problemId,
          sponsorId: sponsor.id,
          score: result.score,
          reasons: result.reasons,
          status: 'matched',
        },
      });
      written += 1;
    }
    return written;
  }

  private async matchableCompany(orgId: string): Promise<MatchableCompany> {
    const info = await this.prisma.industryProfile.findUnique({ where: { orgId } });
    if (!info) {
      throw ProblemException.invalidState(
        'Finish onboarding before the match engine can score anything for you.',
      );
    }
    return {
      csrThemes: info.csrThemes,
      geographies: info.geographies,
      technologyDomains: info.technologyDomains,
      capabilities: info.capabilities,
      sdgPreferences: info.sdgPreferences,
      provenDomains: info.provenDomains,
      fundingMin: Number(info.fundingMin),
      fundingMax: Number(info.fundingMax),
      financialYear: info.csrFinancialYear ?? currentFinancialYear(),
    };
  }

  /* --------------------------------------------------------------- utils */

  /**
   * The administrative chain for each jurisdiction, innermost first.
   *
   * Resolved in one pass over the whole tree rather than a query per problem:
   * the tree is a district's worth of rows and the challenge list walks it once
   * per render.
   */
  private async jurisdictionChains(ids: string[]): Promise<Map<string, string[]>> {
    const all = await this.prisma.jurisdiction.findMany({
      select: { id: true, name: true, parentId: true },
    });
    const byId = new Map(all.map((j) => [j.id, j]));
    const out = new Map<string, string[]>();

    for (const id of new Set(ids)) {
      const chain: string[] = [];
      let current = byId.get(id);
      while (current) {
        chain.push(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      out.set(id, chain);
    }
    return out;
  }

  private asSource(
    row: Prisma.ProblemGetPayload<{ include: typeof CHALLENGE_INCLUDE }>,
    chains: Map<string, string[]>,
  ): ChallengeSource {
    return {
      ...row,
      profile: row.challengeProfile,
      jurisdictionChain: chains.get(row.jurisdictionId) ?? [],
      factors: row.factors
        ? {
            populationImpact: row.factors.populationImpact,
            severity: row.factors.severity,
            deprivation: row.factors.deprivation,
            coverage: row.factors.coverage,
            duration: row.factors.duration,
            recurrence: row.factors.recurrence,
            repeatedDemand: row.factors.repeatedDemand,
            citizenVotes: row.factors.citizenVotes,
          }
        : null,
      adjustments: row.adjustments.map((a) => ({
        label: a.label,
        points: a.points,
        reason: a.reason,
      })),
    };
  }
}

/**
 * Exactly the columns a challenge is built from.
 *
 * Written as an explicit include rather than a bare `findMany`, so the row that
 * reaches `toChallenge` does not carry the reports, the reporters or the
 * internal funding notes in the first place. If a projection bug ever did spread
 * a row, there would be nothing sensitive in it to spread.
 */
const CHALLENGE_INCLUDE = {
  department: { select: { name: true, shortName: true } },
  jurisdiction: { select: { id: true, name: true, parentId: true } },
  villages: {
    select: { village: { select: { name: true, population: true, deprivation: true } } },
  },
  ai: { select: { clusterLabel: true, categoryConfidence: true, durationDays: true } },
  factors: true,
  adjustments: { select: { label: true, points: true, reason: true } },
  sponsorship: {
    select: {
      status: true,
      approvedSponsorId: true,
      approvedAmount: true,
      responseDueAt: true,
    },
  },
  funding: { select: { status: true, required: true, source: true, approvedAt: true } },
  challengeProfile: true,
} satisfies Prisma.ProblemInclude;

function asMatchable(c: Record<string, unknown>): MatchableChallenge {
  return {
    domain: String(c.domain),
    state: String(c.state),
    district: String(c.district),
    technologies: (c.technologies as string[]) ?? [],
    capabilitiesNeeded: (c.capabilitiesNeeded as string[]) ?? [],
    fundingRequired: Number(c.fundingRequired ?? 0),
    estimatedCost: Number(c.estimatedCost ?? 0),
    sdgs: (c.sdgs as number[]) ?? [],
  };
}

/** Indian financial year: 1 April to 31 March. */
function currentFinancialYear(date = new Date()): string {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export { CATEGORY_DOMAIN };
