import { clamp } from '../problems/priority/priority.engine';

/**
 * The match engine.
 *
 * A faithful port of `apps/web/src/lib/industry/match.ts`, moved here for the
 * same reason the redaction moved: the score decides which partner is invited
 * to fund a citizen's problem, and it is written to `SponsorshipMatch` where an
 * officer reads it. A number the client computed is a number the client chose.
 *
 * The two files are one algorithm; change one and change the other in the same
 * commit, exactly as with the priority engine.
 *
 * A recommendation a partner cannot interrogate is a recommendation they will
 * not act on. So this is arithmetic, not intuition: five weighted factors, each
 * scored 0–100 against something the company itself declared, each carrying the
 * sentence that explains its own score, plus a short list of named, bounded
 * modifiers — the same shape the government's priority engine uses, for the
 * same reason. "92% match" decomposes on screen into five rows a person can
 * disagree with, and every row points at a field the company can go and change.
 *
 * Pure: it reads a challenge and a profile and returns a reading. No state, no
 * database, unit-testable on its own.
 */

export type Domain =
  | 'water'
  | 'health'
  | 'education'
  | 'agriculture'
  | 'environment'
  | 'energy'
  | 'infrastructure'
  | 'accessibility'
  | 'rural';

export type MatchFactorKey = 'csrTheme' | 'geography' | 'technical' | 'fundingRange' | 'deployment';

export type MatchLevel = 'yes' | 'partial' | 'no';
export type MatchBand = 'strong' | 'good' | 'possible' | 'weak';

export interface MatchFactor {
  key: MatchFactorKey;
  label: string;
  weight: number;
  score: number;
  level: MatchLevel;
  evidence: string;
  lever?: string;
}

export interface MatchModifier {
  label: string;
  points: number;
  reason: string;
}

export interface MatchResult {
  score: number;
  band: MatchBand;
  factors: MatchFactor[];
  modifiers: MatchModifier[];
  headline: string;
  gap?: string;
  /**
   * The flat, human-readable list stored on `SponsorshipMatch.reasons`.
   *
   * An officer opening the sponsorship tab six months later reads these, not a
   * factor object. A match whose reason was not persisted is a match nobody
   * can defend, which is the same as a match nobody will act on.
   */
  reasons: string[];
}

export const FACTOR_WEIGHTS: Record<MatchFactorKey, number> = {
  csrTheme: 25,
  technical: 25,
  geography: 20,
  fundingRange: 15,
  deployment: 15,
};

export const FACTOR_LABEL: Record<MatchFactorKey, string> = {
  csrTheme: 'CSR theme',
  technical: 'Technical capability',
  geography: 'Geography',
  fundingRange: 'Funding range',
  deployment: 'Deployment capability',
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  water: 'Water & Sanitation',
  health: 'Healthcare',
  education: 'Education',
  agriculture: 'Agriculture',
  environment: 'Environment',
  energy: 'Energy',
  infrastructure: 'Infrastructure',
  accessibility: 'Accessibility',
  rural: 'Rural Development',
};

/**
 * Domains that are neighbours in practice.
 *
 * A company whose CSR theme is rural development is not the wrong partner for a
 * village water scheme, and pretending otherwise makes the engine look foolish
 * the first time somebody reads a zero. Neighbours score partial credit and say
 * so.
 */
const ADJACENT: Partial<Record<Domain, Domain[]>> = {
  water: ['rural', 'health', 'environment'],
  rural: ['water', 'agriculture', 'infrastructure', 'energy'],
  agriculture: ['rural', 'environment'],
  health: ['water', 'accessibility'],
  education: ['accessibility', 'rural'],
  environment: ['water', 'agriculture', 'energy'],
  energy: ['rural', 'infrastructure', 'environment'],
  infrastructure: ['rural', 'energy'],
  accessibility: ['education', 'health'],
};

/** States a Jharkhand-registered CSR programme can usually extend into. */
const NEIGHBOURING: Record<string, string[]> = {
  Jharkhand: ['Bihar', 'West Bengal', 'Odisha', 'Chhattisgarh'],
  Odisha: ['Jharkhand', 'West Bengal', 'Chhattisgarh', 'Andhra Pradesh'],
  Maharashtra: ['Gujarat', 'Madhya Pradesh', 'Telangana', 'Karnataka', 'Goa'],
};

const CAPABILITY_LABEL: Record<string, string> = {
  manufacturing: 'manufacturing',
  testing: 'testing & calibration',
  'field-deployment': 'field deployment',
  software: 'software',
  hardware: 'hardware',
  logistics: 'logistics',
  training: 'training',
  certification: 'certification & standards',
};

/** The most the modifiers can move a score, and the shallow-requirement cap. */
export const MODIFIER_CAP = 5;
const SHALLOW_CAP = 70;

export interface MatchableChallenge {
  domain: Domain | string;
  state: string;
  district: string;
  technologies: string[];
  capabilitiesNeeded: string[];
  fundingRequired: number;
  estimatedCost: number;
  sdgs: number[];
}

export interface MatchableCompany {
  csrThemes: string[];
  geographies: string[];
  technologyDomains: string[];
  capabilities: string[];
  sdgPreferences: number[];
  provenDomains: string[];
  fundingMin: number;
  fundingMax: number;
  financialYear: string;
}

const money = (v: number) => `₹${(v / 100000).toFixed(1)} L`;
const domainLabel = (d: string) => DOMAIN_LABEL[d as Domain] ?? d;

function csrThemeFactor(c: MatchableChallenge, co: MatchableCompany): MatchFactor {
  const base = {
    key: 'csrTheme' as const,
    label: FACTOR_LABEL.csrTheme,
    weight: FACTOR_WEIGHTS.csrTheme,
  };
  const label = domainLabel(c.domain);

  if (co.csrThemes.includes(c.domain)) {
    return {
      ...base,
      score: 100,
      level: 'yes',
      evidence: `${label} is one of your ${co.csrThemes.length} board-approved CSR themes for ${co.financialYear}.`,
    };
  }

  const neighbour = (ADJACENT[c.domain as Domain] ?? []).find((a) => co.csrThemes.includes(a));
  if (neighbour) {
    return {
      ...base,
      score: 45,
      level: 'partial',
      evidence: `${label} is not a declared theme, but it sits alongside ${domainLabel(neighbour)}, which is.`,
      lever: `Add ${label} to your CSR themes to score this in full.`,
    };
  }

  return {
    ...base,
    score: 0,
    level: 'no',
    evidence: `${label} is outside every CSR theme your board approved for this year.`,
    lever: `Add ${label} to your CSR themes in Company Profile.`,
  };
}

function geographyFactor(c: MatchableChallenge, co: MatchableCompany): MatchFactor {
  const base = {
    key: 'geography' as const,
    label: FACTOR_LABEL.geography,
    weight: FACTOR_WEIGHTS.geography,
  };

  if (co.geographies.includes(c.state)) {
    return {
      ...base,
      score: 100,
      level: 'yes',
      evidence: `${c.district}, ${c.state} — a state you are registered to spend and deploy in.`,
    };
  }

  const bridge = co.geographies.find((g) => (NEIGHBOURING[g] ?? []).includes(c.state));
  if (bridge) {
    return {
      ...base,
      score: 30,
      level: 'partial',
      evidence: `${c.state} borders ${bridge}, where you already operate — but you have no registered presence there.`,
      lever: `Add ${c.state} to your deployment geographies.`,
    };
  }

  return {
    ...base,
    score: 0,
    level: 'no',
    evidence: `${c.state} is outside your declared geographies (${co.geographies.join(', ')}).`,
    lever: `Add ${c.state} to your deployment geographies.`,
  };
}

function technicalFactor(c: MatchableChallenge, co: MatchableCompany): MatchFactor {
  const base = {
    key: 'technical' as const,
    label: FACTOR_LABEL.technical,
    weight: FACTOR_WEIGHTS.technical,
  };
  const needed = c.technologies;

  if (needed.length === 0) {
    return {
      ...base,
      score: 50,
      level: 'partial',
      evidence:
        'No technology requirement has been specified yet — this is a delivery and funding challenge more than an engineering one.',
    };
  }

  const have = needed.filter((t) => co.technologyDomains.includes(t));
  const missing = needed.filter((t) => !co.technologyDomains.includes(t));
  /* A challenge naming one or two technologies cannot certify a deep
     engineering fit — covering a shallow requirement in full says more about
     the requirement than about the company, so the factor is capped. */
  const shallow = needed.length < 3;
  const score = Math.min(
    shallow ? SHALLOW_CAP : 100,
    Math.round((have.length / needed.length) * 100),
  );

  if (shallow && missing.length === 0) {
    return {
      ...base,
      score,
      level: 'partial',
      evidence: `This needs ${needed.join(' and ')}, which you practise — but the requirement is shallow enough that your technical depth is not what decides the outcome here.`,
    };
  }

  return {
    ...base,
    score,
    level: score === 100 ? 'yes' : score >= 50 ? 'partial' : 'no',
    evidence:
      have.length > 0
        ? `You practise ${have.length} of the ${needed.length} technologies this needs — ${have.join(', ')}.`
        : `None of the ${needed.length} technologies this needs (${needed.join(', ')}) is a declared domain of yours.`,
    lever:
      missing.length > 0
        ? `Gap: ${missing.join(', ')}. A co-development partner or a university lab can close it.`
        : undefined,
  };
}

function fundingFactor(c: MatchableChallenge, co: MatchableCompany): MatchFactor {
  const base = {
    key: 'fundingRange' as const,
    label: FACTOR_LABEL.fundingRange,
    weight: FACTOR_WEIGHTS.fundingRange,
  };
  const need = c.fundingRequired || c.estimatedCost;

  if (need >= co.fundingMin && need <= co.fundingMax) {
    return {
      ...base,
      score: 100,
      level: 'yes',
      evidence: `${money(need)} still needed, inside the ${money(co.fundingMin)}–${money(co.fundingMax)} band you review.`,
    };
  }

  if (need < co.fundingMin) {
    return {
      ...base,
      score: 65,
      level: 'partial',
      evidence: `${money(need)} is below your ${money(co.fundingMin)} floor — small enough that your review process costs more than the grant.`,
      lever: 'Lower your minimum project size, or fold this into a larger programme.',
    };
  }

  /* Above the ceiling is not a refusal — it is an invitation to co-fund, which
     is the whole point of the funding ledger. */
  const share = Math.round((co.fundingMax / need) * 100);
  return {
    ...base,
    score: clamp(share),
    level: share >= 50 ? 'partial' : 'no',
    evidence: `${money(need)} exceeds your ${money(co.fundingMax)} ceiling. You could carry ${share}% of it alongside co-funders.`,
    lever: 'Commit a partial amount and let the ledger find the rest.',
  };
}

function deploymentFactor(c: MatchableChallenge, co: MatchableCompany): MatchFactor {
  const base = {
    key: 'deployment' as const,
    label: FACTOR_LABEL.deployment,
    weight: FACTOR_WEIGHTS.deployment,
  };
  const needed = c.capabilitiesNeeded;

  if (needed.length === 0) {
    return {
      ...base,
      score: 60,
      level: 'partial',
      evidence:
        'Deployment will be carried by the government department; no partner capability is required.',
    };
  }

  const have = needed.filter((x) => co.capabilities.includes(x));
  const missing = needed.filter((x) => !co.capabilities.includes(x));
  const shallow = needed.length < 2;
  const score = Math.min(
    shallow ? SHALLOW_CAP : 100,
    Math.round((have.length / needed.length) * 100),
  );
  const name = (x: string) => CAPABILITY_LABEL[x] ?? x;

  if (shallow && missing.length === 0) {
    return {
      ...base,
      score,
      level: 'partial',
      evidence: `Only ${have.map(name).join(', ')} is required, which you hold — a low bar rather than a strong signal.`,
    };
  }

  return {
    ...base,
    score,
    level: score === 100 ? 'yes' : score >= 50 ? 'partial' : 'no',
    evidence:
      have.length > 0
        ? `You hold ${have.length} of the ${needed.length} capabilities the build needs — ${have.map(name).join(', ')}.`
        : `You hold none of the ${needed.length} capabilities this build needs.`,
    lever: missing.length > 0 ? `Missing: ${missing.map(name).join(', ')}.` : undefined,
  };
}

/**
 * Named, bounded corrections applied after the weighted sum.
 *
 * Each is worth a handful of points at most and each carries its reason, so the
 * score never moves for a cause the reader cannot see. Nothing here can rescue
 * a challenge the five factors rejected.
 */
function modifiersFor(c: MatchableChallenge, co: MatchableCompany): MatchModifier[] {
  const out: MatchModifier[] = [];

  if (co.provenDomains.includes(c.domain)) {
    out.push({
      label: 'Delivered in this domain before',
      points: 2,
      reason: `You have completed work in ${domainLabel(c.domain)}, so the delivery risk here is lower than the factors alone suggest.`,
    });
  }

  const sharedSdg = c.sdgs.filter((s) => co.sdgPreferences.includes(s));
  if (sharedSdg.length > 0) {
    out.push({
      label: 'SDG alignment',
      points: Math.min(2, sharedSdg.length),
      reason: `Contributes to SDG ${sharedSdg.join(', ')}, which your CSR policy reports against.`,
    });
  }

  return out;
}

export function matchChallenge(c: MatchableChallenge, co: MatchableCompany): MatchResult {
  const factors: MatchFactor[] = [
    csrThemeFactor(c, co),
    technicalFactor(c, co),
    geographyFactor(c, co),
    fundingFactor(c, co),
    deploymentFactor(c, co),
  ];

  const base = factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0);
  const modifiers = modifiersFor(c, co);
  /* Capped, so no accumulation of small corrections can rescue a challenge the
     five factors rejected. The five decide the match; these break ties. */
  const bonus = Math.min(
    MODIFIER_CAP,
    modifiers.reduce((s, m) => s + m.points, 0),
  );
  const score = clamp(Math.round(base + bonus));

  const ranked = [...factors].sort(
    (a, b) => (b.score * b.weight) / 100 - (a.score * a.weight) / 100,
  );
  const [first, second] = ranked;
  const weakest = [...factors].sort((a, b) => a.score - b.score)[0];

  return {
    score,
    band: score >= 85 ? 'strong' : score >= 70 ? 'good' : score >= 50 ? 'possible' : 'weak',
    factors,
    modifiers,
    headline:
      `${first.label.toLowerCase()} and ${second.label.toLowerCase()} carry ` +
      `${Math.round((first.score * first.weight) / 100 + (second.score * second.weight) / 100)} ` +
      `of the ${Math.round(base)} points before modifiers`,
    gap: weakest.score < 100 ? weakest.lever : undefined,
    // What gets persisted. Each factor's own sentence, plus each modifier's.
    reasons: [
      ...factors.map((f) => `${f.label}: ${f.evidence}`),
      ...modifiers.map((m) => m.reason),
    ],
  };
}
