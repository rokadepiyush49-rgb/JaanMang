/**
 * The match engine.
 *
 * A recommendation a partner cannot interrogate is a recommendation they will
 * not act on. So this is arithmetic, not intuition: five weighted factors, each
 * scored 0–100 against something the company itself declared, each carrying the
 * sentence that explains its own score, plus a short list of named, bounded
 * modifiers — the same shape the government's priority engine uses, for the
 * same reason.
 *
 * "92% match" therefore decomposes on screen into five rows a person can
 * disagree with, and every one of those rows points at a field in the company
 * profile that the company can go and change.
 *
 * The engine is pure. It reads a challenge and a profile and returns a reading;
 * it holds no state, hits no service, and can be unit-tested on its own.
 */

import { clamp } from "@/lib/gov/priority";
import { DOMAIN_LABEL } from "./challenges";
import type { Capability, Challenge, CompanyProfile, Domain } from "./types";

/* ============================================================ factors === */

export type MatchFactorKey =
  | "csrTheme"
  | "geography"
  | "technical"
  | "fundingRange"
  | "deployment";

export type MatchLevel = "yes" | "partial" | "no";

export type MatchFactor = {
  key: MatchFactorKey;
  label: string;
  /** Share of the total this factor can contribute. The five sum to 100. */
  weight: number;
  score: number;
  level: MatchLevel;
  /** Why it scored what it scored, in the company's own terms. */
  evidence: string;
  /** What the company would have to change to move it. */
  lever?: string;
};

export type MatchModifier = {
  label: string;
  points: number;
  reason: string;
};

export type MatchBand = "strong" | "good" | "possible" | "weak";

export type MatchResult = {
  score: number;
  band: MatchBand;
  factors: MatchFactor[];
  modifiers: MatchModifier[];
  /** One sentence naming the two factors that decided it. */
  headline: string;
  /** The single thing standing between this and a higher score. */
  gap?: string;
};

export const FACTOR_WEIGHTS: Record<MatchFactorKey, number> = {
  csrTheme: 25,
  technical: 25,
  geography: 20,
  fundingRange: 15,
  deployment: 15,
};

export const FACTOR_LABEL: Record<MatchFactorKey, string> = {
  csrTheme: "CSR theme",
  technical: "Technical capability",
  geography: "Geography",
  fundingRange: "Funding range",
  deployment: "Deployment capability",
};

export const FACTOR_HELP: Record<MatchFactorKey, string> = {
  csrTheme: "Whether the challenge's domain is one your board approved for CSR spending this year.",
  technical: "How much of the technology the solution needs your engineering organisation already practises.",
  geography: "Whether the state is one you are registered to spend and deploy in.",
  fundingRange: "Whether the amount still needed sits inside the project size you review.",
  deployment: "Whether you hold the capabilities the build and handover will actually require.",
};

/* ---------------------------------------------------------------------- */

/**
 * Domains that are neighbours in practice.
 *
 * A company whose CSR theme is rural development is not the wrong partner for
 * a village water scheme, and pretending otherwise makes the engine look
 * foolish the first time someone reads a zero. Neighbours score partial credit
 * and say so.
 */
const ADJACENT: Partial<Record<Domain, Domain[]>> = {
  water: ["rural", "health", "environment"],
  rural: ["water", "agriculture", "infrastructure", "energy"],
  agriculture: ["rural", "environment"],
  health: ["water", "accessibility"],
  education: ["accessibility", "rural"],
  environment: ["water", "agriculture", "energy"],
  energy: ["rural", "infrastructure", "environment"],
  infrastructure: ["rural", "energy"],
  accessibility: ["education", "health"],
};

/** States a Jharkhand-registered CSR programme can usually extend into. */
const NEIGHBOURING: Record<string, string[]> = {
  Jharkhand: ["Bihar", "West Bengal", "Odisha", "Chhattisgarh"],
  Odisha: ["Jharkhand", "West Bengal", "Chhattisgarh", "Andhra Pradesh"],
  Maharashtra: ["Gujarat", "Madhya Pradesh", "Telangana", "Karnataka", "Goa"],
};

function csrThemeFactor(challenge: Challenge, company: CompanyProfile): MatchFactor {
  const domain = challenge.domain;
  const label = DOMAIN_LABEL[domain];

  if (company.csrThemes.includes(domain)) {
    return {
      key: "csrTheme",
      label: FACTOR_LABEL.csrTheme,
      weight: FACTOR_WEIGHTS.csrTheme,
      score: 100,
      level: "yes",
      evidence: `${label} is one of your ${company.csrThemes.length} board-approved CSR themes for ${company.csrBudget.financialYear}.`,
    };
  }

  const neighbour = (ADJACENT[domain] ?? []).find((a) => company.csrThemes.includes(a));
  if (neighbour) {
    return {
      key: "csrTheme",
      label: FACTOR_LABEL.csrTheme,
      weight: FACTOR_WEIGHTS.csrTheme,
      score: 45,
      level: "partial",
      evidence: `${label} is not a declared theme, but it sits alongside ${DOMAIN_LABEL[neighbour]}, which is.`,
      lever: `Add ${label} to your CSR themes to score this in full.`,
    };
  }

  return {
    key: "csrTheme",
    label: FACTOR_LABEL.csrTheme,
    weight: FACTOR_WEIGHTS.csrTheme,
    score: 0,
    level: "no",
    evidence: `${label} is outside every CSR theme your board approved for this year.`,
    lever: `Add ${label} to your CSR themes in Company Profile.`,
  };
}

function geographyFactor(challenge: Challenge, company: CompanyProfile): MatchFactor {
  if (company.geographies.includes(challenge.state)) {
    return {
      key: "geography",
      label: FACTOR_LABEL.geography,
      weight: FACTOR_WEIGHTS.geography,
      score: 100,
      level: "yes",
      evidence: `${challenge.district}, ${challenge.state} — a state you are registered to spend and deploy in.`,
    };
  }

  const bridge = company.geographies.find((g) => (NEIGHBOURING[g] ?? []).includes(challenge.state));
  if (bridge) {
    return {
      key: "geography",
      label: FACTOR_LABEL.geography,
      weight: FACTOR_WEIGHTS.geography,
      score: 30,
      level: "partial",
      evidence: `${challenge.state} borders ${bridge}, where you already operate — but you have no registered presence there.`,
      lever: `Add ${challenge.state} to your deployment geographies.`,
    };
  }

  return {
    key: "geography",
    label: FACTOR_LABEL.geography,
    weight: FACTOR_WEIGHTS.geography,
    score: 0,
    level: "no",
    evidence: `${challenge.state} is outside your declared geographies (${company.geographies.join(", ")}).`,
    lever: `Add ${challenge.state} to your deployment geographies.`,
  };
}

function technicalFactor(challenge: Challenge, company: CompanyProfile): MatchFactor {
  const needed = challenge.technologies;
  if (!needed.length) {
    return {
      key: "technical",
      label: FACTOR_LABEL.technical,
      weight: FACTOR_WEIGHTS.technical,
      score: 50,
      level: "partial",
      evidence: "No technology requirement has been specified yet — this is a delivery and funding challenge more than an engineering one.",
    };
  }

  const have = needed.filter((t) => company.technologyDomains.includes(t));
  const missing = needed.filter((t) => !company.technologyDomains.includes(t));
  /* A challenge that names one or two technologies cannot certify a deep
     engineering fit — covering a shallow requirement in full says more about
     the requirement than about the company, so the factor is capped. */
  const shallow = needed.length < 3;
  const score = Math.min(shallow ? SHALLOW_CAP : 100, Math.round((have.length / needed.length) * 100));

  if (shallow && !missing.length) {
    return {
      key: "technical",
      label: FACTOR_LABEL.technical,
      weight: FACTOR_WEIGHTS.technical,
      score,
      level: "partial",
      evidence: `This needs ${needed.join(" and ")}, which you practise — but the requirement is shallow enough that your technical depth is not what decides the outcome here.`,
    };
  }

  return {
    key: "technical",
    label: FACTOR_LABEL.technical,
    weight: FACTOR_WEIGHTS.technical,
    score,
    level: score === 100 ? "yes" : score >= 50 ? "partial" : "no",
    evidence: have.length
      ? `You practise ${have.length} of the ${needed.length} technologies this needs — ${have.join(", ")}.`
      : `None of the ${needed.length} technologies this needs (${needed.join(", ")}) is a declared domain of yours.`,
    lever: missing.length ? `Gap: ${missing.join(", ")}. A co-development partner or a university lab can close it.` : undefined,
  };
}

function fundingFactor(challenge: Challenge, company: CompanyProfile): MatchFactor {
  const { min, max } = company.fundingRange;
  const need = challenge.fundingRequired || challenge.estimatedCost;
  const money = (v: number) => `₹${(v / 100000).toFixed(1)} L`;

  if (need >= min && need <= max) {
    return {
      key: "fundingRange",
      label: FACTOR_LABEL.fundingRange,
      weight: FACTOR_WEIGHTS.fundingRange,
      score: 100,
      level: "yes",
      evidence: `${money(need)} still needed, inside the ${money(min)}–${money(max)} band you review.`,
    };
  }

  if (need < min) {
    return {
      key: "fundingRange",
      label: FACTOR_LABEL.fundingRange,
      weight: FACTOR_WEIGHTS.fundingRange,
      score: 65,
      level: "partial",
      evidence: `${money(need)} is below your ${money(min)} floor — small enough that your review process costs more than the grant.`,
      lever: "Lower your minimum project size, or fold this into a larger programme.",
    };
  }

  /* Above the ceiling is not a refusal — it is an invitation to co-fund, which
     is the whole point of the funding ledger. */
  const share = Math.round((max / need) * 100);
  return {
    key: "fundingRange",
    label: FACTOR_LABEL.fundingRange,
    weight: FACTOR_WEIGHTS.fundingRange,
    score: clamp(share),
    level: share >= 50 ? "partial" : "no",
    evidence: `${money(need)} exceeds your ${money(max)} ceiling. You could carry ${share}% of it alongside co-funders.`,
    lever: "Commit a partial amount and let the ledger find the rest.",
  };
}

const CAPABILITY_LABEL: Record<Capability, string> = {
  manufacturing: "manufacturing",
  testing: "testing & calibration",
  "field-deployment": "field deployment",
  software: "software",
  hardware: "hardware",
  logistics: "logistics",
  training: "training",
  certification: "certification & standards",
};

function deploymentFactor(challenge: Challenge, company: CompanyProfile): MatchFactor {
  const needed = challenge.capabilitiesNeeded;
  if (!needed.length) {
    return {
      key: "deployment",
      label: FACTOR_LABEL.deployment,
      weight: FACTOR_WEIGHTS.deployment,
      score: 60,
      level: "partial",
      evidence: "Deployment will be carried by the government department; no partner capability is required.",
    };
  }

  const have = needed.filter((c) => company.capabilities.includes(c));
  const missing = needed.filter((c) => !company.capabilities.includes(c));
  const shallow = needed.length < 2;
  const score = Math.min(shallow ? SHALLOW_CAP : 100, Math.round((have.length / needed.length) * 100));

  if (shallow && !missing.length) {
    return {
      key: "deployment",
      label: FACTOR_LABEL.deployment,
      weight: FACTOR_WEIGHTS.deployment,
      score,
      level: "partial",
      evidence: `Only ${have.map((c) => CAPABILITY_LABEL[c]).join(", ")} is required, which you hold — a low bar rather than a strong signal.`,
    };
  }

  return {
    key: "deployment",
    label: FACTOR_LABEL.deployment,
    weight: FACTOR_WEIGHTS.deployment,
    score,
    level: score === 100 ? "yes" : score >= 50 ? "partial" : "no",
    evidence: have.length
      ? `You hold ${have.length} of the ${needed.length} capabilities the build needs — ${have.map((c) => CAPABILITY_LABEL[c]).join(", ")}.`
      : `You hold none of the ${needed.length} capabilities this build needs.`,
    lever: missing.length ? `Missing: ${missing.map((c) => CAPABILITY_LABEL[c]).join(", ")}.` : undefined,
  };
}

/* ========================================================== modifiers === */

/**
 * Named, bounded corrections applied after the weighted sum.
 *
 * Each is worth a handful of points at most and each carries its reason, so the
 * score never moves for a cause the reader cannot see. Nothing here can rescue
 * a challenge the five factors rejected.
 */
function modifiersFor(
  challenge: Challenge,
  company: CompanyProfile,
  context: MatchContext,
): MatchModifier[] {
  const out: MatchModifier[] = [];

  if (company.provenDomains.includes(challenge.domain)) {
    out.push({
      label: "Delivered in this domain before",
      points: 2,
      reason: `You have completed work in ${DOMAIN_LABEL[challenge.domain]}, so the delivery risk here is lower than the factors alone suggest.`,
    });
  }

  const sharedSdg = challenge.sdgs.filter((s) => company.sdgPreferences.includes(s));
  if (sharedSdg.length) {
    out.push({
      label: "SDG alignment",
      points: Math.min(2, sharedSdg.length),
      reason: `Contributes to SDG ${sharedSdg.join(", ")}, which your CSR policy reports against.`,
    });
  }

  if (challenge.universityId && context.partnerUniversityIds.includes(challenge.universityId)) {
    out.push({
      label: "University already a partner",
      points: 2,
      reason: "You have a running project with this university, so the contracting and reporting groundwork already exists.",
    });
  }

  if (challenge.teamId && context.mentoredTeamIds.includes(challenge.teamId)) {
    out.push({
      label: "Your mentors already know this team",
      points: 1,
      reason: "An engineer of yours is already in this team's design reviews.",
    });
  }

  return out;
}

/* ============================================================= engine === */

export type MatchContext = {
  /** Universities the company already has a running project with. */
  partnerUniversityIds: string[];
  /** Teams the company's employees already mentor. */
  mentoredTeamIds: string[];
};

export const EMPTY_CONTEXT: MatchContext = { partnerUniversityIds: [], mentoredTeamIds: [] };

/**
 * The most the modifiers can move a score, in total, and the ceiling a shallow
 * requirement can reach on the two capability factors.
 */
export const MODIFIER_CAP = 5;
const SHALLOW_CAP = 70;

export function matchChallenge(
  challenge: Challenge,
  company: CompanyProfile,
  context: MatchContext = EMPTY_CONTEXT,
): MatchResult {
  const factors: MatchFactor[] = [
    csrThemeFactor(challenge, company),
    technicalFactor(challenge, company),
    geographyFactor(challenge, company),
    fundingFactor(challenge, company),
    deploymentFactor(challenge, company),
  ];

  const base = factors.reduce((sum, f) => sum + (f.score * f.weight) / 100, 0);
  const modifiers = modifiersFor(challenge, company, context);
  /* Capped, so no accumulation of small corrections can rescue a challenge the
     five factors rejected. The five weighted factors decide the match; these
     only break ties between challenges the factors scored alike. */
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
    band: score >= 85 ? "strong" : score >= 70 ? "good" : score >= 50 ? "possible" : "weak",
    factors,
    modifiers,
    headline: `${first.label.toLowerCase()} and ${second.label.toLowerCase()} carry ${Math.round(
      ((first.score * first.weight) / 100 + (second.score * second.weight) / 100),
    )} of the ${Math.round(base)} points before modifiers`,
    gap: weakest.score < 100 ? weakest.lever : undefined,
  };
}

export const BAND_LABEL: Record<MatchBand, string> = {
  strong: "Strong match",
  good: "Good match",
  possible: "Possible match",
  weak: "Weak match",
};
