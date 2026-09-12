import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { d, h } from './clock';

/**
 * The industry partner surface.
 *
 * Two jobs. It turns the partner-facing briefs in
 * `apps/web/src/lib/industry/challenges.ts` into `ChallengeProfile` rows — the
 * layer the government has no reason to hold: which technologies a solution
 * needs, which capability gap is the real obstacle, what success is defined as
 * before anyone commits. Extracted by `npm run fixtures:extract` so the numbers
 * a partner sees can never drift from the ones the screens were reviewed
 * against.
 *
 * And it registers the demo company as a sponsor. `seedGov` creates five
 * sponsors from the government fixture and none of them is an organisation on
 * the platform — they are names an officer picked from a list. Nirvaha
 * Technologies is the company whose account you actually sign in to, so it
 * needs a `Sponsor` row of its own, or the portal signs you in to a CSR
 * dashboard that can neither commit to anything nor show a rupee of history.
 *
 * Runs after `seedGov` (problems, sponsors) and `seedOnboarding` (the company).
 */

type Enrichment = {
  summary: string;
  technologies?: string[];
  capabilitiesNeeded?: string[];
  supportNeeded?: string[];
  timelineDays?: number;
  sanctionReference?: string;
  domain?: string;
  expectedOutcomes?: unknown[];
  evidence?: unknown[];
};

type Fixture = {
  categoryDomain: Record<string, string>;
  enrichment: Record<string, Enrichment>;
};

const ORG = 'co-nirvaha';
const SPONSOR = 'sp-nirvaha';

export async function seedIndustry(prisma: PrismaClient): Promise<{ devLogins: string[] }> {
  const fixture = JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures/industry.json'), 'utf8'),
  ) as Fixture;

  /* ------------------------------------------------------------- profiles */

  const problems = await prisma.problem.findMany({
    select: { id: true, category: true, title: true },
  });

  let profiles = 0;
  for (const problem of problems) {
    const e = fixture.enrichment[problem.id];
    if (!e) continue;

    await prisma.challengeProfile.create({
      data: {
        problemId: problem.id,
        summary: e.summary,
        domain: e.domain ?? fixture.categoryDomain[problem.category] ?? 'rural',
        technologies: e.technologies ?? [],
        capabilitiesNeeded: e.capabilitiesNeeded ?? [],
        supportNeeded: e.supportNeeded ?? ['fund'],
        timelineDays: e.timelineDays ?? 120,
        sanctionReference: e.sanctionReference ?? null,
        expectedOutcomes: (e.expectedOutcomes ?? []) as Prisma.InputJsonValue,
        evidence: (e.evidence ?? []) as Prisma.InputJsonValue,
        publishedAt: d(9),
      },
    });
    profiles += 1;
  }

  /* -------------------------------------------------------------- sponsor */

  await prisma.sponsor.create({
    data: {
      id: SPONSOR,
      orgId: ORG,
      name: 'Nirvaha Technologies',
      sector: 'Industrial IoT & Water Infrastructure',
      csrThemes: ['water', 'rural', 'education', 'health', 'environment'],
      csrGeographies: ['Jharkhand', 'Odisha', 'Maharashtra'],
      csrBudgetRemaining: 7_200_000,
      responseRate: 0.82,
    },
  });

  /**
   * One sponsorship carried through to a filed benefit, so the CSR screen has
   * a real position rather than an empty year.
   *
   * P-1008 — the Chandaghasi school roof — was approved by Hindalco in the
   * government fixture. It moves to Nirvaha here because the demo account has
   * to own at least one completed sponsorship for the CSR report to be
   * anything other than a form. Hindalco stays on the register and stays
   * matched elsewhere; nothing else about the problem changes.
   */
  await prisma.sponsorship.update({
    where: { problemId: 'P-1008' },
    data: { approvedSponsorId: SPONSOR },
  });

  await prisma.sponsorshipMatch.upsert({
    where: { problemId_sponsorId: { problemId: 'P-1008', sponsorId: SPONSOR } },
    update: { status: 'approved', respondedAt: d(19) },
    create: {
      problemId: 'P-1008',
      sponsorId: SPONSOR,
      score: 88,
      reasons: [
        'CSR theme: Education is one of your 5 board-approved CSR themes for FY 2026–27.',
        'Geography: Nagri, Ranchi District — a state you are registered to spend and deploy in.',
        'Funding range: ₹4.8 L still needed, inside the ₹1.5 L–₹25.0 L band you review.',
      ],
      status: 'approved',
      proposalAmount: 480_000,
      respondedAt: d(19),
    },
  });

  await prisma.sponsorshipMatch.updateMany({
    where: { problemId: 'P-1008', sponsorId: 'sp-hindalco' },
    data: { status: 'declined', note: 'Withdrew in favour of a local partner.' },
  });

  // The CSR benefit already seeded against P-1008 now belongs to Nirvaha,
  // because it hangs off the sponsorship rather than off the sponsor.

  /**
   * Live interest, so the officer's sponsorship queue and the partner's
   * commitments list both have something in them that is not yet settled.
   */
  await prisma.sponsorshipMatch.upsert({
    where: { problemId_sponsorId: { problemId: 'P-1042', sponsorId: SPONSOR } },
    update: {},
    create: {
      problemId: 'P-1042',
      sponsorId: SPONSOR,
      score: 94,
      reasons: [
        'CSR theme: Water & Sanitation is one of your 5 board-approved CSR themes for FY 2026–27.',
        'Technical capability: You practise 4 of the 6 technologies this needs — IoT & Telemetry, LoRaWAN, Sensors & Instrumentation, AI/ML.',
        'Geography: Nagri, Ranchi District — a state you are registered to spend and deploy in.',
      ],
      status: 'proposal',
      proposalAmount: 150_000,
      note: 'Can fund the instrumentation and second an engineer for the field build.',
      respondedAt: h(6),
    },
  });

  await prisma.sponsorshipMatch.upsert({
    where: { problemId_sponsorId: { problemId: 'P-1049', sponsorId: SPONSOR } },
    update: {},
    create: {
      problemId: 'P-1049',
      sponsorId: SPONSOR,
      score: 71,
      reasons: [
        'CSR theme: Water & Sanitation is one of your 5 board-approved CSR themes for FY 2026–27.',
        'Funding range: ₹2.1 L still needed, inside the ₹1.5 L–₹25.0 L band you review.',
        'Deployment capability: You hold 1 of the 2 capabilities the build needs — field deployment.',
      ],
      status: 'matched',
    },
  });

  return {
    devLogins: [
      `industry@jansetu.local        Industry · Nirvaha Technologies (sponsor of P-1008, ${profiles} challenge briefs)`,
    ],
  };
}
