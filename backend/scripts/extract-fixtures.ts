/**
 * Extracts the fixture data from apps/web into JSON files the seed consumes
 * (`prisma/seed/fixtures/{gov,industry}.json`).
 *
 * Why a build step rather than importing the fixtures directly in seed.ts:
 * the seed must not couple the backend's typecheck/build to the web source
 * tree, but the fixture numbers (12 problems, ~80 reports, the exact priority
 * factors) are the contract every `/gov` screen was reviewed against, so they
 * must not be re-typed by hand either. This script bridges the two: run it when
 * apps/web's gov fixtures change, commit the regenerated JSON.
 *
 *   npm run fixtures:extract
 *
 * It reaches into ../apps/web with tsx's on-the-fly transpile; it is never part
 * of `nest build`.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const WEB = resolve(process.cwd(), '../apps/web/src/lib/gov');
const WEB_INDUSTRY = resolve(process.cwd(), '../apps/web/src/lib/industry');

/* eslint-disable @typescript-eslint/no-explicit-any */

async function main(): Promise<void> {
  // Reached via a runtime path so the backend's typecheck never follows it into
  // the web source tree. The shapes are validated by the seed that consumes the
  // JSON, not here.
  const mock: any = await import(`${WEB}/mock-data.ts`);
  const priority: any = await import(`${WEB}/priority.ts`);
  const challenges: any = await import(`${WEB_INDUSTRY}/challenges.ts`);

  const bundle = {
    _generatedAt: new Date().toISOString(),
    _source: 'apps/web/src/lib/gov/{mock-data,priority}.ts',
    defaultWeights: priority.DEFAULT_WEIGHTS,
    jurisdictions: mock.JURISDICTIONS,
    villages: mock.VILLAGES,
    departments: mock.DEPARTMENTS,
    officers: mock.OFFICERS,
    govUsers: mock.GOV_USERS,
    sponsors: mock.SPONSORS,
    problems: mock.PROBLEMS,
    reports: mock.REPORTS,
    automations: mock.AUTOMATIONS,
    alerts: mock.ALERTS,
    weeklyTrend: mock.WEEKLY_TREND,
  };

  /**
   * The industry-facing overlay, kept in its own file because it is a different
   * authorship: the government fixture is what an officer validated, this is
   * the partner-facing brief written on top of it. `seedIndustry` turns these
   * into `ChallengeProfile` rows.
   */
  const industry = {
    _generatedAt: new Date().toISOString(),
    _source: 'apps/web/src/lib/industry/challenges.ts',
    categoryDomain: challenges.CATEGORY_DOMAIN,
    domainLabel: challenges.DOMAIN_LABEL,
    enrichment: challenges.ENRICHMENT,
  };

  const outDir = resolve(process.cwd(), 'prisma/seed/fixtures');
  mkdirSync(outDir, { recursive: true });
  const out = resolve(outDir, 'gov.json');
  writeFileSync(out, JSON.stringify(bundle, null, 2) + '\n');
  const industryOut = resolve(outDir, 'industry.json');
  writeFileSync(industryOut, JSON.stringify(industry, null, 2) + '\n');

  process.stderr.write(
    `Wrote ${out}\n` +
      `  ${bundle.problems.length} problems, ${bundle.reports.length} reports, ` +
      `${bundle.villages.length} villages, ${bundle.officers.length} officers\n` +
      `Wrote ${industryOut}\n` +
      `  ${Object.keys(industry.enrichment).length} challenge profiles\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});
