import { Injectable, Logger } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';

export type Category = $Enums.ProblemCategory;
export type Severity = $Enums.Severity;

/**
 * What the intake pass makes of one citizen's words.
 *
 * Note what is *not* here: population impact, deprivation and coverage. Those
 * come from the village register, not from a language model — asking a model to
 * guess how deprived a habitation is, when the SECC figure is sitting in a
 * table, would be inventing a number that already exists. The model reads the
 * text; the register supplies the facts about the place.
 */
export interface IntakeReading {
  title: string;
  summary: string;
  category: Category;
  severity: Severity;
  /** 0–1. Below the clustering threshold the report stays its own problem. */
  confidence: number;
  /** `[{ label, value }]` — the structured lines shown beside the raw text. */
  interpretation: { label: string; value: string }[];
  /** Terms the classifier matched on, reused by clustering for text similarity. */
  keywords: string[];
  source: 'groq' | 'keywords';
}

/**
 * The keyword table. Hindi and English, because the reports are in both.
 *
 * This is not a stub standing in for the model. It is the path a fresh clone
 * takes, the path every test takes, and the path production takes the moment
 * Groq is rate-limiting or down — so it has to produce a usable problem on its
 * own. It is also the only classifier whose output can be explained to an
 * officer term by term, which is why the terms it matched are carried through
 * to `interpretation` rather than thrown away.
 */
const CATEGORY_TERMS: Record<Category, string[]> = {
  // prettier-ignore
  water: ['water', 'handpump', 'hand pump', 'tap', 'tubewell', 'borewell', 'tanker', 'पानी', 'नल', 'चापाकल', 'कुआं', 'जल', 'paani', 'pani', 'chapakal', 'chapa kal', 'nal', 'kuan', 'jal', 'sukha', 'boring'],
  // prettier-ignore
  roads: ['road', 'street', 'path', 'pothole', 'metalled', 'washed out', 'सड़क', 'रास्ता', 'गड्ढा', 'sadak', 'sarak', 'rasta', 'raasta', 'gaddha', 'gadda'],
  // prettier-ignore
  drainage: ['drain', 'drainage', 'sewer', 'waterlogging', 'water logging', 'overflow', 'नाली', 'जलजमाव', 'नाला', 'naali', 'nali', 'nala', 'jaljamav'],
  // prettier-ignore
  streetlight: ['streetlight', 'street light', 'lamp', 'light', 'pole', 'dark', 'बत्ती', 'रोशनी', 'लाइट', 'अंधेरा', 'batti', 'bijli', 'roshni', 'andhera', 'khamba'],
  // prettier-ignore
  waste: ['garbage', 'waste', 'trash', 'rubbish', 'dump', 'sweeper', 'कूड़ा', 'कचरा', 'सफाई', 'kooda', 'kuda', 'kachra', 'kachara', 'safai', 'gandagi'],
  // prettier-ignore
  bridge: ['bridge', 'deck', 'span', 'crossing', 'culvert', 'पुल', 'पुलिया', 'pul', 'puliya'],
  // prettier-ignore
  sanitation: ['toilet', 'latrine', 'sanitation', 'open defecation', 'शौचालय', 'स्वच्छता', 'shauchalay', 'sauchalay', 'latrin'],
  // prettier-ignore
  school: ['school', 'classroom', 'teacher', 'anganwadi', 'midday meal', 'स्कूल', 'विद्यालय', 'शिक्षक', 'आंगनबाड़ी', 'vidyalaya', 'shikshak', 'aanganwadi', 'madhyahn'],
  // prettier-ignore
  health: ['hospital', 'phc', 'clinic', 'doctor', 'anm', 'medicine', 'ambulance', 'अस्पताल', 'डॉक्टर', 'दवा', 'aspatal', 'daktar', 'dawa', 'dawai', 'asptal'],
};

/**
 * What separates one word from the next.
 *
 * `\p{M}` is there because Devanagari falls apart without it: the vowel signs
 * and the nukta are combining marks, not letters, so a class of
 * `[^\p{L}\p{N}]` treats them as separators and splits "पानी" into "प" and
 * "न" and "सड़क" into "सड" and "क". Every Devanagari term in the vocabulary
 * silently failed to match, and reports in the script half the district writes
 * in were classified as though they were blank.
 */
const WORD_SEPARATOR = /[^\p{L}\p{N}\p{M}]+/u;

/**
 * Terms that are real but weak evidence, because they turn up in reports about
 * several different things.
 *
 * "Naali ka pani ghar mein aa raha hai" is a drainage report that mentions
 * water, and with every term worth the same it tied with the water category and
 * lost on object key order. A structural noun — the drain, the handpump, the
 * bridge — says what the problem *is*; a substance noun often just says what is
 * moving.
 */
const WEAK_TERMS = new Set(['water', 'paani', 'pani', 'jal', 'पानी', 'जल', 'light', 'लाइट']);
const WEAK_WEIGHT = 0.6;

/**
 * Whether a term appears in a piece of text, matching whole words.
 *
 * Substring containment looked simpler and was quietly wrong: `nal` matched
 * "final" and "canal", `tar` matched "start", and a report about a road not
 * being well maintained matched the water category on the word "well". Short
 * terms are exactly the ones a Hinglish vocabulary is full of, so the matcher
 * has to respect word boundaries.
 *
 * Multi-word terms ("hand pump") still match on the raw text, and a trailing
 * plural is folded in so "lights" matches `light`.
 */
function termMatcher(text: string): (term: string) => boolean {
  const lower = text.toLowerCase();
  const words = new Set<string>();
  for (const word of lower.split(WORD_SEPARATOR)) {
    if (!word) continue;
    words.add(word);
    if (word.length > 3 && word.endsWith('s')) words.add(word.slice(0, -1));
    if (word.length > 4 && word.endsWith('es')) words.add(word.slice(0, -2));
  }
  return (term: string) => (term.includes(' ') ? lower.includes(term) : words.has(term));
}

/** Words that raise severity regardless of category. */
const SEVERITY_TERMS: Record<Exclude<Severity, 'low'>, string[]> = {
  // prettier-ignore
  critical: ['died', 'death', 'collapsed', 'electrocut', 'drowned', 'emergency', 'outbreak', 'मौत', 'गिर गया', 'हादसा', 'maut', 'hadsa', 'gir gaya'],
  // prettier-ignore
  high: ['child', 'children', 'hospital', 'pregnant', 'sick', 'ill', 'injury', 'injured', 'unsafe', 'contaminated', 'बच्चे', 'बीमार', 'गर्भवती', 'खतरा', 'bachche', 'bimar', 'beemar', 'garbhvati', 'khatra'],
  // prettier-ignore
  medium: ['days', 'weeks', 'months', 'repeatedly', 'again', 'still', 'दिन', 'हफ्ते', 'महीने', 'बार-बार', 'din', 'hafte', 'mahine', 'baar baar'],
};

const CATEGORY_LABEL: Record<Category, string> = {
  water: 'Water supply',
  roads: 'Roads',
  drainage: 'Drainage',
  streetlight: 'Street lighting',
  waste: 'Waste collection',
  bridge: 'Bridge',
  sanitation: 'Sanitation',
  school: 'School',
  health: 'Health',
};

/**
 * Terms that mean the same thing across the three scripts a report arrives in.
 *
 * Clustering compares reports by shared vocabulary, and vocabulary is exactly
 * what two people describing one broken handpump do not share when one writes
 * English and the other writes Hindi in Latin letters. "The handpump near the
 * school has been dry for six days" and "School ke paas wala chapakal sukha
 * pada hai" have one word in common — `school` — and a lexical matcher puts
 * them in different problems, which is the single most damaging thing this
 * pipeline could do to a bilingual district.
 *
 * The classifier already knows `chapakal` and `handpump` are the same thing;
 * this is that knowledge written where clustering can also read it. Each group
 * collapses to its key, so the two reports above share four terms instead of
 * one and land in the same cluster.
 *
 * Not a translation table and not trying to be. It covers the nouns and states
 * that civic reports are actually built from, which is a short list.
 */
// prettier-ignore
const SYNONYMS: Record<string, string[]> = {
  handpump: ['handpump', 'hand pump', 'chapakal', 'chapa kal', 'चापाकल'],
  water:    ['water', 'paani', 'pani', 'जल', 'पानी', 'jal'],
  tap:      ['tap', 'nal', 'नल'],
  well:     ['well', 'kuan', 'kuaan', 'कुआं', 'boring', 'borewell', 'tubewell'],
  dry:      ['dry', 'sukha', 'सूखा', 'sookha'],
  broken:   ['broken', 'kharab', 'खराब', 'toota', 'टूटा', 'damaged'],
  road:     ['road', 'sadak', 'sarak', 'सड़क', 'rasta', 'raasta', 'रास्ता'],
  pothole:  ['pothole', 'gaddha', 'gadda', 'गड्ढा'],
  bridge:   ['bridge', 'pul', 'पुल', 'puliya', 'पुलिया'],
  drain:    ['drain', 'naali', 'nali', 'नाली', 'nala', 'नाला', 'sewer'],
  light:    ['light', 'batti', 'बत्ती', 'roshni', 'रोशनी', 'bijli', 'streetlight', 'street light'],
  dark:     ['dark', 'andhera', 'अंधेरा'],
  waste:    ['garbage', 'waste', 'kooda', 'kuda', 'कूड़ा', 'kachra', 'kachara', 'कचरा', 'gandagi'],
  cleaning: ['cleaning', 'safai', 'सफाई', 'sweeper'],
  toilet:   ['toilet', 'latrine', 'shauchalay', 'sauchalay', 'शौचालय'],
  school:   ['school', 'vidyalaya', 'स्कूल', 'विद्यालय', 'anganwadi', 'aanganwadi', 'आंगनबाड़ी'],
  teacher:  ['teacher', 'shikshak', 'शिक्षक'],
  hospital: ['hospital', 'aspatal', 'asptal', 'अस्पताल', 'phc', 'clinic'],
  doctor:   ['doctor', 'daktar', 'डॉक्टर'],
  medicine: ['medicine', 'dawa', 'dawai', 'दवा'],
  power:    ['power', 'electricity', 'bijli', 'बिजली', 'current'],
};

/**
 * The canonical terms present in a piece of text, whatever script it is in.
 *
 * Used alongside plain tokenisation when clustering compares two reports: the
 * lexical tokens catch the specifics, these catch the fact that both are about
 * a dry handpump.
 */
export function canonicalTerms(text: string): Set<string> {
  const has = termMatcher(text);
  const found = new Set<string>();
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    if (variants.some(has)) found.add(canonical);
  }
  return found;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-20b';
const GROQ_TIMEOUT_MS = 8_000;

@Injectable()
export class IntakeAiService {
  private readonly logger = new Logger('IntakeAi');

  constructor(private readonly config: AppConfigService) {}

  /** True when the hosted model is configured. Reported by the intake response. */
  get usingModel(): boolean {
    return Boolean(this.config.groqApiKey);
  }

  /**
   * Read one report.
   *
   * Never throws and never returns nothing: a model that is absent, slow,
   * rate-limited or returns nonsense all end at the same keyword pass. An
   * intake endpoint that can fail because a third party is having a bad day is
   * an intake endpoint that loses a citizen's report.
   */
  async read(
    raw: string,
    hint?: { category?: Category; village?: string },
  ): Promise<IntakeReading> {
    const fallback = this.keywordRead(raw, hint);
    if (!this.config.groqApiKey) return fallback;

    try {
      const model = await this.groqRead(raw, hint);
      return model ?? fallback;
    } catch (error) {
      this.logger.warn(`intake model unavailable, using keyword pass: ${String(error)}`);
      return fallback;
    }
  }

  /* ------------------------------------------------------------- keywords -- */

  /**
   * Deterministic classification by term matching.
   *
   * Confidence is the margin between the best and second-best category, not the
   * raw hit count: three water terms mean little if there are also three
   * drainage terms, and that ambiguity is exactly the case clustering must not
   * guess at. A report scoring below the threshold becomes its own problem.
   */
  keywordRead(raw: string, hint?: { category?: Category; village?: string }): IntakeReading {
    const has = termMatcher(raw);

    const scores = (Object.entries(CATEGORY_TERMS) as [Category, string[]][]).map(
      ([category, terms]) => {
        const matched = terms.filter(has);
        // Weighted rather than counted, so one diagnostic noun outranks one
        // generic one. See WEAK_TERMS.
        const score = matched.reduce((n, t) => n + (WEAK_TERMS.has(t) ? WEAK_WEIGHT : 1), 0);
        return { category, matched, score };
      },
    );
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const runnerUp = scores[1];

    // A citizen who picked a category on the form is better evidence than term
    // matching, so it wins — but the terms still decide confidence, because a
    // form default nobody changed is not evidence of anything.
    const category = hint?.category ?? (best.score > 0 ? best.category : 'water');
    const matched = hint?.category
      ? (CATEGORY_TERMS[hint.category] ?? []).filter(has)
      : best.matched;

    const confidence = confidenceOf(best.score, runnerUp.score, Boolean(hint?.category));
    const severity = severityOf(raw);

    return {
      title: titleOf(raw, category, hint?.village),
      summary: summaryOf(raw),
      category,
      severity,
      confidence,
      keywords: matched,
      interpretation: [
        { label: 'Category', value: CATEGORY_LABEL[category] },
        { label: 'Severity', value: severity },
        {
          label: 'Read by',
          value: 'Keyword pass (no model configured) — terms matched, not inferred',
        },
        {
          label: 'Terms matched',
          value: matched.length > 0 ? matched.join(', ') : 'none — classified by the reporter',
        },
      ],
      source: 'keywords',
    };
  }

  /* ------------------------------------------------------------------ groq -- */

  private async groqRead(
    raw: string,
    hint?: { category?: Category; village?: string },
  ): Promise<IntakeReading | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${this.config.groqApiKey ?? ''}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You read civic problem reports from rural Jharkhand, in Hindi or English. ' +
                'Reply with JSON only: {"title": string (max 90 chars, no place name unless the reporter gave one), ' +
                '"summary": string (max 240 chars, plain and factual), ' +
                `"category": one of ${Object.keys(CATEGORY_TERMS).join('|')}, ` +
                '"severity": one of critical|high|medium|low, ' +
                '"confidence": number 0-1 for how clearly the text identifies the category, ' +
                '"keywords": array of up to 8 significant terms from the text. ' +
                'Do not infer how many people are affected or how deprived the village is — ' +
                'those come from the register, not from you. Never invent facts the text does not state.',
            },
            {
              role: 'user',
              content: hint?.village ? `Village: ${hint.village}\n\nReport: ${raw}` : raw,
            },
          ],
        }),
      });

      if (!res.ok) {
        this.logger.warn(`groq intake returned ${res.status}`);
        return null;
      }

      const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return null;

      return this.parse(content, raw, hint);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Narrow the model's JSON, field by field, to the shapes the database will
   * accept. Anything unrecognised falls back to the keyword pass's answer for
   * that field rather than failing the whole read — a model that got the
   * severity wrong should not cost us a correct category.
   */
  private parse(
    content: string,
    raw: string,
    hint?: { category?: Category; village?: string },
  ): IntakeReading | null {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return null;
    }

    const fallback = this.keywordRead(raw, hint);
    const category = isCategory(parsed.category) ? parsed.category : fallback.category;
    const severity = isSeverity(parsed.severity) ? parsed.severity : fallback.severity;
    const confidence =
      typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
        ? parsed.confidence
        : fallback.confidence;
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k): k is string => typeof k === 'string').slice(0, 8)
      : fallback.keywords;

    return {
      title: trimTo(typeof parsed.title === 'string' ? parsed.title : fallback.title, 90),
      summary: trimTo(typeof parsed.summary === 'string' ? parsed.summary : fallback.summary, 240),
      category: hint?.category ?? category,
      severity,
      confidence,
      keywords,
      interpretation: [
        { label: 'Category', value: CATEGORY_LABEL[hint?.category ?? category] },
        { label: 'Severity', value: severity },
        { label: 'Read by', value: `${GROQ_MODEL} via Groq` },
        {
          label: 'Terms matched',
          value: keywords.length > 0 ? keywords.join(', ') : 'none recorded',
        },
      ],
      source: 'groq',
    };
  }
}

/* ------------------------------------------------------------------ pure -- */

/**
 * How sure the classification is, as the margin over the next-best category.
 *
 * One unambiguous term beats three that are spread across two categories. A
 * reporter-chosen category floors it at 0.6: they know what their problem is,
 * but they also picked from a dropdown, so it is not certainty either.
 */
export function confidenceOf(best: number, runnerUp: number, reporterChose: boolean): number {
  if (best === 0) return reporterChose ? 0.6 : 0.2;
  const margin = (best - runnerUp) / best;
  const raw = Math.min(0.95, 0.45 + 0.35 * margin + 0.05 * Math.min(best, 4));
  return Number((reporterChose ? Math.max(raw, 0.6) : raw).toFixed(2));
}

/** Highest severity band with a term present; `low` when none match. */
export function severityOf(text: string): Severity {
  const has = termMatcher(text);
  for (const band of ['critical', 'high', 'medium'] as const) {
    if (SEVERITY_TERMS[band].some(has)) return band;
  }
  return 'low';
}

/**
 * A title from the report's own words, not a generated one.
 *
 * The first clause of what the citizen wrote, capped — so an officer reading
 * the queue sees the reporter's framing rather than a paraphrase. Falls back to
 * "<Category> issue reported at <village>" only when there is no usable clause.
 */
export function titleOf(raw: string, category: Category, village?: string): string {
  const firstClause =
    raw
      .trim()
      .split(/[.!?\n।]/)[0]
      ?.trim() ?? '';
  if (firstClause.length >= 12) return trimTo(firstClause, 90);
  return village
    ? `${CATEGORY_LABEL[category]} issue reported at ${village}`
    : `${CATEGORY_LABEL[category]} issue reported`;
}

export function summaryOf(raw: string): string {
  return trimTo(raw.trim().replace(/\s+/g, ' '), 240);
}

function trimTo(value: string, max: number): string {
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && value in CATEGORY_TERMS;
}

function isSeverity(value: unknown): value is Severity {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low';
}

export { CATEGORY_TERMS, CATEGORY_LABEL };
