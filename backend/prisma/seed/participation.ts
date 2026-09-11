import * as argon2 from 'argon2';
import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import { ahead, d, h } from './clock';

/**
 * The participation, CSR and recognition layer, seeded over the Ranchi-district
 * data the other seeds already lay down.
 *
 * Runs last, because every row here points at something one of the earlier
 * seeds created: votes point at `seedGov`'s twelve problems, ratings at its
 * completed projects, CSR benefits at its approved sponsorships, proposals and
 * hackathon entries at `seedInstitute`'s BIT Mesra teams.
 *
 * Two deliberate properties, both of which exist so the surfaces built on top
 * are tested against something other than a happy path:
 *
 *   - The numbers disagree with each other. The most-reported problem is not
 *     the most-voted one (P-1042 is reported by the villages that have no
 *     water; P-1038 is voted for by the whole block that uses the road), which
 *     is the entire reason the priority engine keeps `reportCount` and
 *     `voteCount` as separate weighted factors.
 *   - Not everything is good. One project is rated 2 stars with a reason, one
 *     proposal was rejected, one CSR file is stuck un-certified, and one
 *     hackathon team withdrew. A seed where every queue is empty and every
 *     score is high proves nothing about whether the screen works.
 */

const DEV_PASSWORD = 'jansetu-dev';

/**
 * Citizens who are not students.
 *
 * The existing seed's only citizen-kind accounts are the nine BIT Mesra
 * students, which makes a citizen leaderboard a student leaderboard. These are
 * residents: they report, vote, verify and rate, and they hold no other role.
 *
 * They get the dev password for the same reason the government accounts do —
 * phone OTP delivery is not wired up, so an email sign-in is the only way to
 * open these accounts on a demo machine.
 */
const RESIDENTS = [
  { id: 'cit-bimla', name: 'Bimla Devi', village: 'v-nagri', phone: '+919431100101' },
  { id: 'cit-suresh', name: 'Suresh Oraon', village: 'v-nagri', phone: '+919431100102' },
  { id: 'cit-kalawati', name: 'Kalawati Kumari', village: 'v-tigra', phone: '+919431100103' },
  { id: 'cit-mahadev', name: 'Mahadev Bhagat', village: 'v-tigra', phone: '+919431100104' },
  { id: 'cit-rukmini', name: 'Rukmini Toppo', village: 'v-booty', phone: '+919431100105' },
  { id: 'cit-jitendra', name: 'Jitendra Munda', village: 'v-booty', phone: '+919431100106' },
  { id: 'cit-shanti', name: 'Shanti Ekka', village: 'v-chandaghasi', phone: '+919431100107' },
  { id: 'cit-ramesh', name: 'Ramesh Sahu', village: 'v-chandaghasi', phone: '+919431100108' },
  { id: 'cit-parvati', name: 'Parvati Kachhap', village: 'v-hesag', phone: '+919431100109' },
  { id: 'cit-anil', name: 'Anil Mahto', village: 'v-hesag', phone: '+919431100110' },
  { id: 'cit-sabina', name: 'Sabina Khatun', village: 'v-kanke', phone: '+919431100111' },
  { id: 'cit-dilip', name: 'Dilip Lohra', village: 'v-kanke', phone: '+919431100112' },
  { id: 'cit-lakshmi', name: 'Lakshmi Nag', village: 'v-pithoria', phone: '+919431100113' },
  { id: 'cit-gopal', name: 'Gopal Ram', village: 'v-pithoria', phone: '+919431100114' },
  { id: 'cit-fatima', name: 'Fatima Ansari', village: 'v-ormanjhi', phone: '+919431100115' },
  { id: 'cit-birsa', name: 'Birsa Tirkey', village: 'v-ormanjhi', phone: '+919431100116' },
];

/**
 * Which SDG a problem category serves.
 *
 * The mapping is the platform's, stated once here so the seed, the matcher and
 * the public portal cannot each invent their own. It is intentionally narrow —
 * almost everything could be argued into SDG 11, and a tag that is on every row
 * filters nothing.
 */
const SDG_BY_CATEGORY: Record<$Enums.ProblemCategory, number[]> = {
  water: [6],
  roads: [9, 11],
  drainage: [6, 11],
  streetlight: [7, 11],
  waste: [11, 12],
  bridge: [9, 11],
  sanitation: [6, 3],
  school: [4],
  health: [3],
};

/**
 * Votes per problem, as resident ids.
 *
 * Read these against the reportCount the gov seed sets, because the two
 * disagree on purpose. P-1038 is the most *reported* problem in the register —
 * 122 households whose approach road washed out. P-1012 is the most *voted*: a
 * cracked bridge deck only 18 households thought to report, and which every
 * person who crosses the Kanchi stream agrees is the thing to fix first.
 *
 * A ranking that merges the two numbers on the way in cannot tell those cases
 * apart, which is why `reportCount` and `voteCount` stay separate weighted
 * factors the whole way through.
 */
const VOTES: Record<string, string[]> = {
  // Everybody crosses the bridge. Almost nobody filed it as their own problem.
  'P-1012': RESIDENTS.map((r) => r.id),
  'P-1042': ['cit-bimla', 'cit-suresh', 'cit-kalawati', 'cit-mahadev', 'cit-rukmini', 'cit-shanti', 'cit-parvati', 'cit-anil', 'cit-sabina'],
  // Heavily reported by the households on it; voted for by rather fewer.
  'P-1038': ['cit-lakshmi', 'cit-gopal', 'cit-fatima', 'cit-birsa', 'cit-dilip'],
  'P-1035': ['cit-fatima', 'cit-birsa', 'cit-lakshmi', 'cit-gopal', 'cit-dilip', 'cit-anil'],
  'P-1051': ['cit-rukmini', 'cit-jitendra', 'cit-sabina', 'cit-dilip', 'cit-birsa'],
  'P-1049': ['cit-rukmini', 'cit-jitendra', 'cit-shanti', 'cit-parvati'],
  'P-1055': ['cit-sabina', 'cit-dilip', 'cit-anil'],
  'P-1060': ['cit-kalawati', 'cit-mahadev'],
  'P-1046': ['cit-parvati', 'cit-anil', 'cit-sabina', 'cit-shanti', 'cit-ramesh'],
  'P-1008': ['cit-shanti', 'cit-ramesh', 'cit-bimla'],
};

/** Students who also vote — a student is a citizen of somewhere. */
const STUDENT_VOTES: Record<string, string[]> = {
  'P-1042': ['stu-rohit', 'stu-neha', 'stu-priya', 'user-student'],
  'P-1051': ['stu-anita', 'stu-vikas'],
  'P-1012': ['stu-imran', 'stu-sameer', 'stu-dinesh'],
  'P-1055': ['stu-farah', 'stu-priya'],
};

export async function seedParticipation(prisma: PrismaClient): Promise<{ devLogins: string[] }> {
  const passwordHash = await argon2.hash(DEV_PASSWORD);
  const citizenRole = await prisma.role.findUniqueOrThrow({ where: { key: 'citizen' } });

  // -------------------------------------------------------------------------
  // Residents
  // -------------------------------------------------------------------------
  for (const r of RESIDENTS) {
    await prisma.user.create({
      data: {
        id: r.id,
        kind: 'citizen',
        status: 'active',
        displayName: r.name,
        email: `${r.id}@jansetu.local`,
        phone: r.phone,
        passwordHash,
        locale: 'hi',
        phoneVerifiedAt: d(40),
        emailVerifiedAt: d(40),
        lastLoginAt: h(RESIDENTS.indexOf(r) * 5 + 2),
        createdAt: d(45),
        roles: { create: { roleId: citizenRole.id } },
      },
    });
  }

  // -------------------------------------------------------------------------
  // SDG tags
  //
  // Applied from the category map, then projects inherit from the problem they
  // came from. An industry project without a problem keeps its own tags.
  // -------------------------------------------------------------------------
  const problems = await prisma.problem.findMany({ select: { id: true, category: true } });
  for (const p of problems) {
    await prisma.problem.update({
      where: { id: p.id },
      data: { sdgGoals: SDG_BY_CATEGORY[p.category] },
    });
  }

  const projects = await prisma.project.findMany({ select: { id: true, problemId: true } });
  for (const proj of projects) {
    const parent = proj.problemId ? problems.find((p) => p.id === proj.problemId) : undefined;
    await prisma.project.update({
      where: { id: proj.id },
      data: { sdgGoals: parent ? SDG_BY_CATEGORY[parent.category] : [9, 11] },
    });
  }

  // -------------------------------------------------------------------------
  // Votes
  //
  // `voteCount` is denormalised onto the problem because the priority engine
  // and every list screen read it, and a COUNT per row per request is how a
  // ranked list gets slow. The vote endpoints maintain it in the same
  // transaction as the vote itself.
  // -------------------------------------------------------------------------
  const allVotes: Record<string, string[]> = {};
  for (const [problemId, ids] of Object.entries(VOTES)) allVotes[problemId] = [...ids];
  for (const [problemId, ids] of Object.entries(STUDENT_VOTES)) {
    allVotes[problemId] = [...(allVotes[problemId] ?? []), ...ids];
  }

  for (const [problemId, voterIds] of Object.entries(allVotes)) {
    for (const [i, userId] of voterIds.entries()) {
      await prisma.problemVote.create({
        data: { problemId, userId, createdAt: h(6 * i + 2) },
      });
    }
    await prisma.problem.update({
      where: { id: problemId },
      data: { voteCount: voterIds.length },
    });
  }

  // -------------------------------------------------------------------------
  // CSR benefits
  //
  // Attached to the two approved sponsorships, plus one that is committed and
  // stuck in documentation — the state a CSR officer actually spends their
  // time in, and the one the portal has to make visible.
  // -------------------------------------------------------------------------
  await prisma.csrBenefit.create({
    data: {
      problemId: 'P-1003',
      qualifyingSection: '135',
      scheduleViiItem: '(i) promoting health care including preventive health care',
      financialYear: '2026-27',
      estimatedRelief: 267000,
      csrSpendBefore: 4100000,
      csrSpendAfter: 4990000,
      documentation: 'certified',
      certificateNo: 'CSR/JH/2026/0431',
      certifiedAt: d(22),
      note: 'Form CSR-2 filed with the district CSR cell. Utilisation certificate attached.',
      createdAt: d(38),
    },
  });

  await prisma.csrBenefit.create({
    data: {
      problemId: 'P-1008',
      qualifyingSection: '135',
      scheduleViiItem: '(ii) promoting education, including special education',
      financialYear: '2026-27',
      estimatedRelief: 144000,
      csrSpendBefore: 1250000,
      csrSpendAfter: 1730000,
      documentation: 'submitted',
      note: 'Awaiting the utilisation certificate from the block education office.',
      createdAt: d(19),
    },
  });

  await prisma.csrBenefit.create({
    data: {
      problemId: 'P-1035',
      qualifyingSection: '135',
      scheduleViiItem: '(x) rural development projects',
      financialYear: '2026-27',
      estimatedRelief: 96000,
      csrSpendBefore: 780000,
      csrSpendAfter: 780000,
      documentation: 'drafted',
      note: 'Board approval pending. Relief is an estimate until the amount is committed.',
      createdAt: d(6),
    },
  });

  // -------------------------------------------------------------------------
  // Delivery ratings
  //
  // Only on completed projects, and only from people in the villages the work
  // was done in. The 2-star is the important row: it is what stops the
  // delivery leaderboard from being a list of everybody who finished.
  // -------------------------------------------------------------------------
  const RATINGS: {
    projectId: string;
    userId: string;
    stars: number;
    comment: string;
    timeliness?: number;
    quality?: number;
    conduct?: number;
    daysAgo: number;
  }[] = [
    { projectId: 'PRJ-176', userId: 'cit-bimla', stars: 5, comment: 'बिजली अब रात में भी रहती है। डिलीवरी के समय अंधेरा नहीं हुआ।', timeliness: 5, quality: 5, conduct: 5, daysAgo: 20 },
    { projectId: 'PRJ-176', userId: 'cit-suresh', stars: 4, comment: 'Generator works. Took three weeks longer than the board said it would.', timeliness: 3, quality: 5, conduct: 4, daysAgo: 19 },
    { projectId: 'PRJ-176', userId: 'cit-kalawati', stars: 5, comment: 'Two deliveries at night since it was fixed, no power cut.', timeliness: 4, quality: 5, conduct: 5, daysAgo: 14 },
    { projectId: 'PRJ-211', userId: 'cit-sabina', stars: 2, comment: 'Toilet is repaired but the water connection still runs dry by noon. Half the job.', timeliness: 3, quality: 2, conduct: 3, daysAgo: 5 },
    { projectId: 'PRJ-211', userId: 'cit-dilip', stars: 3, comment: 'Cleaning contract restarted. Let us see if it lasts past the monsoon.', timeliness: 3, quality: 3, conduct: 4, daysAgo: 4 },
    { projectId: 'proj-vidyut', userId: 'cit-bimla', stars: 5, comment: 'The students explained the meter readings to the ANM. Good work.', timeliness: 5, quality: 5, conduct: 5, daysAgo: 12 },
    { projectId: 'proj-vidyut', userId: 'cit-mahadev', stars: 4, comment: 'Backup held through two outages last month.', timeliness: 4, quality: 4, conduct: 5, daysAgo: 9 },
  ];

  for (const r of RATINGS) {
    await prisma.deliveryRating.create({
      data: {
        projectId: r.projectId,
        userId: r.userId,
        stars: r.stars,
        comment: r.comment,
        timeliness: r.timeliness,
        quality: r.quality,
        conduct: r.conduct,
        createdAt: d(r.daysAgo),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Solution proposals
  //
  // BIT Mesra going to government rather than waiting to be matched. One of
  // each outcome, including the rejection, which carries its reason.
  // -------------------------------------------------------------------------
  await prisma.solutionProposal.create({
    data: {
      id: 'prop-tigra-iron',
      problemId: 'P-1060',
      orgId: 'inst-bit-mesra',
      teamId: 'team-jal-setu',
      title: 'Low-cost iron removal filter for Tigra handpumps',
      summary:
        'Discoloured water at Tigra reads as dissolved iron, not contamination. A bolt-on oxidation and sand filter at the pump head is a two-week build and needs no power.',
      approach:
        'Water sampling at four pump heads, an iron assay at the department lab, a prototype filter on one pump, four weeks of daily readings, then a build guide the panchayat can hand to a local fabricator.',
      estimatedCost: 46000,
      durationDays: 60,
      needs: ['Department lab access for the iron assay', 'Panchayat permission to modify one pump head'],
      status: 'under_review',
      submittedById: 'fac-meena',
      submittedAt: d(9),
      createdAt: d(11),
    },
  });

  await prisma.solutionProposal.create({
    data: {
      id: 'prop-kanke-waste',
      problemId: 'P-1055',
      orgId: 'inst-bit-mesra',
      teamId: 'team-swachh',
      title: 'Collection-route tracking for Kanke ward 4',
      summary:
        'Nine missed days is a routing and accountability problem before it is a capacity problem. A phone-based route log makes the misses visible the day they happen instead of nine days later.',
      approach:
        'Map the current route, instrument the collection vehicle with a driver-operated phone log, publish a daily ward-level miss report to the panchayat.',
      estimatedCost: 28000,
      durationDays: 45,
      needs: ['Contact with the ward sanitation contractor'],
      status: 'submitted',
      submittedById: 'fac-sneha',
      submittedAt: d(3),
      createdAt: d(4),
    },
  });

  await prisma.solutionProposal.create({
    data: {
      id: 'prop-pithoria-road',
      problemId: 'P-1038',
      orgId: 'inst-bit-mesra',
      title: 'Student-built gabion retaining structure at Pithoria',
      summary: 'A gabion wall along the washed-out 1.4 km, built with local labour under faculty supervision.',
      approach: 'Slope survey, gabion design to IRC:SP:48, supervised build over one semester.',
      estimatedCost: 310000,
      durationDays: 150,
      needs: ['PWD design sign-off', 'Liability cover for students on an active roadway'],
      status: 'rejected',
      submittedById: 'fac-arun',
      submittedAt: d(26),
      reviewedById: 'user-block',
      reviewedAt: d(21),
      decisionNote:
        'Refused on scope, not on merit: a load-bearing structure on a public road needs a licensed contractor and PWD supervision throughout. The slope survey is welcome as an input to the tender.',
      createdAt: d(28),
    },
  });

  // -------------------------------------------------------------------------
  // Hackathons
  //
  // One finished, so the recognition layer has something to rank; one open, so
  // the student surface has something to join.
  // -------------------------------------------------------------------------
  await prisma.hackathon.create({
    data: {
      id: 'hack-jal-2026',
      code: 'JAL-2026',
      title: 'Jal Sankalp — water continuity sprint',
      about:
        'Forty-eight hours on the three water problems the Nagri panchayat ranked highest. Judged by the block development officer and the district water department, on whether the thing could be built next month, not on the pitch.',
      hostOrgId: 'inst-bit-mesra',
      status: 'completed',
      mode: 'in_person',
      registrationOpensAt: d(70),
      registrationClosesAt: d(56),
      startsAt: d(54),
      endsAt: d(52),
      prizePool: 150000,
      maxTeamSize: 5,
      venue: 'BIT Mesra, Ranchi',
      createdAt: d(75),
      problems: {
        create: [
          { problemId: 'P-1042', track: 'Continuity' },
          { problemId: 'P-1060', track: 'Water quality' },
          { problemId: 'P-1049', track: 'Sanitation' },
        ],
      },
      teams: {
        create: [
          { teamId: 'team-jal-setu', registeredAt: d(60), finalRank: 1, score: 87.5 },
          { teamId: 'team-swachh', registeredAt: d(59), finalRank: 2, score: 74 },
          { teamId: 'team-roshni', registeredAt: d(58), withdrawnAt: d(55) },
        ],
      },
    },
  });

  await prisma.hackathon.create({
    data: {
      id: 'hack-setu-2026',
      code: 'SETU-2026',
      title: 'Setu — rural connectivity build',
      about:
        'Two weeks on the road and bridge problems in the Ranchi block register. Teams that reach a buildable design get routed to the PWD tender as a named input.',
      hostOrgId: 'inst-bit-mesra',
      status: 'registration_open',
      mode: 'hybrid',
      registrationOpensAt: d(4),
      registrationClosesAt: ahead(24 * 6),
      startsAt: ahead(24 * 9),
      endsAt: ahead(24 * 23),
      prizePool: 200000,
      maxTeamSize: 6,
      venue: 'BIT Mesra, Ranchi + online',
      createdAt: d(8),
      problems: {
        create: [
          { problemId: 'P-1012', track: 'Structures' },
          { problemId: 'P-1035', track: 'Structures' },
          { problemId: 'P-1038', track: 'Earthworks' },
        ],
      },
      teams: {
        create: [{ teamId: 'team-setu-bandh', registeredAt: d(2) }],
      },
    },
  });

  // -------------------------------------------------------------------------
  // Badges
  //
  // The rule lives in `criteria`, evaluated by the recognition cron. A new
  // badge is a row; a corrected threshold is an UPDATE, not a deploy.
  // -------------------------------------------------------------------------
  const BADGES: {
    key: string;
    name: string;
    description: string;
    tier: $Enums.BadgeTier;
    surface: $Enums.Surface;
    points: number;
    criteria: Prisma.InputJsonObject;
  }[] = [
    { key: 'first_report', name: 'First Report', description: 'Filed a report that became a validated problem.', tier: 'bronze', surface: 'citizen', points: 10, criteria: { metric: 'reports_validated', gte: 1 } },
    { key: 'verifier_10', name: 'Verifier', description: 'Confirmed or denied ten completed works with evidence.', tier: 'silver', surface: 'citizen', points: 50, criteria: { metric: 'verifications_confirmed', gte: 10 } },
    { key: 'village_voice', name: 'Village Voice', description: 'Voted on twenty problems in your panchayat.', tier: 'bronze', surface: 'citizen', points: 20, criteria: { metric: 'votes_cast', gte: 20 } },
    { key: 'first_delivery', name: 'Delivered', description: 'A project you worked on was verified as fixed by the citizens who reported it.', tier: 'gold', surface: 'student', points: 200, criteria: { metric: 'projects_verified', gte: 1 } },
    { key: 'milestone_5', name: 'Five Milestones', description: 'Completed five reviewed milestones.', tier: 'silver', surface: 'student', points: 75, criteria: { metric: 'milestones_completed', gte: 5 } },
    { key: 'hackathon_winner', name: 'Sprint Winner', description: 'Finished first in a platform hackathon.', tier: 'gold', surface: 'student', points: 150, criteria: { metric: 'hackathon_first_place', gte: 1 } },
    { key: 'csr_certified', name: 'CSR Certified', description: 'Completed a sponsorship through to a filed utilisation certificate.', tier: 'gold', surface: 'industry', points: 200, criteria: { metric: 'csr_benefits_certified', gte: 1 } },
    { key: 'first_sponsor', name: 'First Sponsor', description: 'Funded a validated citizen problem.', tier: 'bronze', surface: 'industry', points: 50, criteria: { metric: 'sponsorships_approved', gte: 1 } },
    { key: 'institute_10_students', name: 'Ten in the Field', description: 'Ten verified students placed on live problems.', tier: 'silver', surface: 'institute', points: 100, criteria: { metric: 'students_on_live_problems', gte: 10 } },
    { key: 'sla_clean', name: 'Clean SLA', description: 'Closed twenty problems without breaching the SLA.', tier: 'gold', surface: 'gov', points: 150, criteria: { metric: 'problems_closed_within_sla', gte: 20 } },
  ];

  for (const b of BADGES) {
    await prisma.badge.create({ data: { ...b, icon: null, active: true, createdAt: d(90) } });
  }

  const EARNED: { badgeKey: string; userId: string; daysAgo: number; evidence: Prisma.InputJsonObject }[] = [
    { badgeKey: 'first_report', userId: 'cit-bimla', daysAgo: 44, evidence: { reports_validated: 2 } },
    { badgeKey: 'first_report', userId: 'cit-sabina', daysAgo: 30, evidence: { reports_validated: 1 } },
    { badgeKey: 'first_report', userId: 'cit-parvati', daysAgo: 27, evidence: { reports_validated: 3 } },
    { badgeKey: 'village_voice', userId: 'cit-anil', daysAgo: 3, evidence: { votes_cast: 20 } },
    { badgeKey: 'first_delivery', userId: 'stu-rohit', daysAgo: 12, evidence: { projects_verified: 1, project: 'proj-vidyut' } },
    { badgeKey: 'first_delivery', userId: 'stu-neha', daysAgo: 12, evidence: { projects_verified: 1, project: 'proj-vidyut' } },
    { badgeKey: 'hackathon_winner', userId: 'stu-rohit', daysAgo: 52, evidence: { hackathon: 'hack-jal-2026', rank: 1 } },
    { badgeKey: 'hackathon_winner', userId: 'stu-priya', daysAgo: 52, evidence: { hackathon: 'hack-jal-2026', rank: 1 } },
    { badgeKey: 'milestone_5', userId: 'stu-imran', daysAgo: 7, evidence: { milestones_completed: 5 } },
  ];

  for (const e of EARNED) {
    const badge = await prisma.badge.findUniqueOrThrow({ where: { key: e.badgeKey } });
    await prisma.badgeEarned.create({
      data: { badgeId: badge.id, userId: e.userId, evidence: e.evidence, earnedAt: d(e.daysAgo) },
    });
  }

  // -------------------------------------------------------------------------
  // Awards — granted by a person, not computed.
  // -------------------------------------------------------------------------
  await prisma.award.create({
    data: {
      id: 'award-jal-2026',
      key: 'hackathon_first',
      name: 'Jal Sankalp 2026 — First Place',
      description: 'Jal Setu, for a telemetry design the water department took to tender.',
      citation: 'Jal Sankalp water continuity sprint, BIT Mesra, judged by the Ranchi Block Development Officer.',
      period: '2026',
      subjectType: 'team',
      subjectId: 'team-jal-setu',
      grantedById: 'user-block',
      grantedAt: d(52),
    },
  });

  await prisma.award.create({
    data: {
      id: 'award-csr-2026',
      key: 'csr_partner_year',
      name: 'CSR Partner of the Year, Ranchi District 2026',
      description: 'Tata Steel Foundation, for the Nagri PHC power backup delivered and verified inside one quarter.',
      period: '2026',
      subjectType: 'organization',
      subjectId: 'sp-tata',
      grantedById: 'user-district',
      grantedAt: d(18),
    },
  });

  await prisma.award.create({
    data: {
      id: 'award-citizen-2026',
      key: 'citizen_verifier_year',
      name: 'Citizen Verifier, Nagri Gram Panchayat 2026',
      description: 'Bimla Devi, for verifying every completed work in Nagri with photographic evidence.',
      period: '2026',
      subjectType: 'user',
      subjectId: 'cit-bimla',
      grantedById: 'user-gp',
      grantedAt: d(15),
    },
  });

  // -------------------------------------------------------------------------
  // Leaderboards
  //
  // Materialised here so the surfaces have rows to render before the
  // recognition cron exists. Every score below is built only from verified
  // outcomes — confirmed verifications, completed milestones, delivered
  // funding, rating averages — and `breakdown` records which, so a rank can be
  // explained on the page rather than asserted.
  // -------------------------------------------------------------------------
  const BOARDS: {
    scope: $Enums.LeaderboardScope;
    subjectType: $Enums.LeaderboardSubject;
    rows: { id: string; name: string; score: number; previousRank?: number; breakdown: Prisma.InputJsonObject }[];
  }[] = [
    {
      scope: 'citizens',
      subjectType: 'user',
      rows: [
        { id: 'cit-bimla', name: 'Bimla Devi', score: 148, previousRank: 1, breakdown: { verificationsConfirmed: 6, reportsValidated: 2, votesCast: 4, ratingsGiven: 2 } },
        { id: 'cit-parvati', name: 'Parvati Kachhap', score: 121, previousRank: 3, breakdown: { verificationsConfirmed: 4, reportsValidated: 3, votesCast: 4, ratingsGiven: 0 } },
        { id: 'cit-sabina', name: 'Sabina Khatun', score: 110, previousRank: 2, breakdown: { verificationsConfirmed: 3, reportsValidated: 1, votesCast: 5, ratingsGiven: 1 } },
        { id: 'cit-anil', name: 'Anil Mahto', score: 96, previousRank: 4, breakdown: { verificationsConfirmed: 2, reportsValidated: 1, votesCast: 5, ratingsGiven: 0 } },
        { id: 'cit-suresh', name: 'Suresh Oraon', score: 74, previousRank: 6, breakdown: { verificationsConfirmed: 2, reportsValidated: 0, votesCast: 3, ratingsGiven: 1 } },
      ],
    },
    {
      scope: 'students',
      subjectType: 'user',
      rows: [
        { id: 'stu-rohit', name: 'Rohit Mahato', score: 430, previousRank: 1, breakdown: { projectsVerified: 1, milestonesCompleted: 6, hackathonFirsts: 1, avgDeliveryRating: 4.5 } },
        { id: 'stu-neha', name: 'Neha Tirkey', score: 385, previousRank: 2, breakdown: { projectsVerified: 1, milestonesCompleted: 5, hackathonFirsts: 0, avgDeliveryRating: 4.5 } },
        { id: 'stu-imran', name: 'Imran Ansari', score: 260, previousRank: 4, breakdown: { projectsVerified: 0, milestonesCompleted: 5, hackathonFirsts: 0, avgDeliveryRating: null } },
        { id: 'stu-priya', name: 'Priya Kumari', score: 240, previousRank: 3, breakdown: { projectsVerified: 0, milestonesCompleted: 3, hackathonFirsts: 1, avgDeliveryRating: null } },
        { id: 'user-student', name: 'Aisha Patel', score: 95, breakdown: { projectsVerified: 0, milestonesCompleted: 2, hackathonFirsts: 0, avgDeliveryRating: null } },
      ],
    },
    {
      scope: 'institutes',
      subjectType: 'organization',
      rows: [
        { id: 'inst-bit-mesra', name: 'Birla Institute of Technology, Mesra', score: 512, previousRank: 1, breakdown: { projectsVerified: 2, studentsOnLiveProblems: 9, proposalsAccepted: 0, avgDeliveryRating: 4.5 } },
      ],
    },
    {
      scope: 'partners',
      subjectType: 'organization',
      rows: [
        { id: 'sp-tata', name: 'Tata Steel Foundation', score: 340, previousRank: 1, breakdown: { sponsorshipsApproved: 1, fundsDelivered: 890000, csrCertified: 1, avgDeliveryRating: 4.67 } },
        { id: 'sp-hindalco', name: 'Hindalco Community Trust', score: 190, previousRank: 2, breakdown: { sponsorshipsApproved: 1, fundsDelivered: 480000, csrCertified: 0, avgDeliveryRating: null } },
      ],
    },
    {
      scope: 'officers',
      subjectType: 'user',
      rows: [
        { id: 'off-01', name: 'Sunita Mahto', score: 288, previousRank: 2, breakdown: { problemsClosedWithinSla: 7, avgResolutionDays: 11.4, avgDeliveryRating: 4.7 } },
        { id: 'off-03', name: 'Anita Kujur', score: 254, previousRank: 1, breakdown: { problemsClosedWithinSla: 6, avgResolutionDays: 13.1, avgDeliveryRating: 4.2 } },
        { id: 'off-02', name: 'Rakesh Oraon', score: 176, previousRank: 3, breakdown: { problemsClosedWithinSla: 4, avgResolutionDays: 18.6, avgDeliveryRating: 2.5 } },
      ],
    },
  ];

  for (const board of BOARDS) {
    for (const [i, row] of board.rows.entries()) {
      await prisma.leaderboardEntry.create({
        data: {
          scope: board.scope,
          subjectType: board.subjectType,
          subjectId: row.id,
          displayName: row.name,
          score: row.score,
          rank: i + 1,
          previousRank: row.previousRank ?? null,
          breakdown: row.breakdown,
          jurisdictionId: 'jh-ran',
          period: 'all-time',
          computedAt: h(3),
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Recommender inputs on the existing students
  //
  // Set here rather than in the institute seed because these are the student's
  // own statements of preference, collected by the student surface, and
  // `verifiedContributions` is a derived count the recognition cron maintains.
  // -------------------------------------------------------------------------
  const STUDENT_PREFS: Record<
    string,
    { categories: $Enums.ProblemCategory[]; sdg: number[]; hours: number; verified: number }
  > = {
    'stu-rohit': { categories: ['water', 'health'], sdg: [6, 3], hours: 12, verified: 1 },
    'stu-neha': { categories: ['water', 'streetlight'], sdg: [6, 7], hours: 10, verified: 1 },
    'stu-imran': { categories: ['bridge', 'roads'], sdg: [9, 11], hours: 15, verified: 0 },
    'stu-priya': { categories: ['waste', 'sanitation'], sdg: [11, 12], hours: 8, verified: 0 },
    'stu-sameer': { categories: ['roads', 'drainage'], sdg: [9, 6], hours: 6, verified: 0 },
    'stu-anita': { categories: ['streetlight', 'school'], sdg: [7, 4], hours: 9, verified: 0 },
    'stu-vikas': { categories: ['water', 'waste'], sdg: [6, 12], hours: 14, verified: 0 },
    'stu-farah': { categories: ['school', 'health'], sdg: [4, 3], hours: 7, verified: 0 },
    'stu-dinesh': { categories: ['bridge', 'drainage'], sdg: [9, 6], hours: 11, verified: 0 },
    'user-student': { categories: ['water', 'school'], sdg: [6, 4], hours: 10, verified: 0 },
  };

  for (const [userId, p] of Object.entries(STUDENT_PREFS)) {
    await prisma.studentProfile.update({
      where: { userId },
      data: {
        preferredCategories: p.categories,
        preferredDistricts: ['Ranchi'],
        sdgInterests: p.sdg,
        weeklyHours: p.hours,
        verifiedContributions: p.verified,
        lastRecommendedAt: h(5),
      },
    });
  }

  const voteTotal = Object.values(allVotes).reduce((n, v) => n + v.length, 0);

  return {
    devLogins: [
      `cit-bimla@jansetu.local        Bimla Devi — resident, Nagri (${voteTotal} votes seeded across ${Object.keys(allVotes).length} problems)`,
      `cit-sabina@jansetu.local       Sabina Khatun — resident, Kanke Chowk (rated PRJ-211 two stars)`,
    ],
  };
}
