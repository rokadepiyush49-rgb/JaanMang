"use client";

/**
 * The council's verdict on a finished session.
 *
 * Generated on arrival from the transcript in `sessionStorage`, not stored:
 * the verdict is a pure function of the session, so caching it would only
 * create a second thing that can be stale. Re-reading the page re-asks the
 * council, which also means a rate-limited attempt can simply be retried.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, ButtonLink, Card, PageHeading, Tag } from "@/components/ui";
import { localizedAgent } from "@/lib/council/roster";
import { stringsFor, type Strings } from "@/lib/i18n/strings";
import { useLocale } from "@/lib/i18n/use-locale";
import { getSessionSnapshot, type StoredSession } from "@/lib/council/session-store";

import type { ApiError, ScoreDimension, VerdictResponse } from "@/lib/council/types";

/** Bar colour per dimension, so the same measure keeps the same colour. */
const BAR_TONES: Record<ScoreDimension, string> = {
  practicality: "bg-navy",
  socialImpact: "bg-impact",
  technicalFeasibility: "bg-community",
  financialViability: "bg-navy",
  novelty: "bg-impact",
};

function ReadinessRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative flex size-36 items-center justify-center">
      <svg className="-rotate-90" height="144" viewBox="0 0 144 144" width="144">
        <circle cx="72" cy="72" fill="none" r={radius} stroke="var(--color-line)" strokeWidth="12" />
        <circle
          cx="72"
          cy="72"
          fill="none"
          r={radius}
          stroke="var(--color-impact-deep)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          strokeLinecap="round"
          strokeWidth="12"
        />
      </svg>
      <span className="absolute text-center">
        <span className="block text-4xl font-bold text-ink tabular-nums">{score}</span>
        <span className="mono-data text-ink-faint">/100</span>
      </span>
    </div>
  );
}

/**
 * Renders `text` with each highlight phrase marked.
 *
 * Phrases are matched literally — `verdict.ts` has already discarded any that
 * are not verbatim substrings — and longest-first, so a highlight nested
 * inside a longer one cannot split it into fragments.
 */
function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  if (phrases.length === 0) return <>{text}</>;

  const ordered = [...phrases].sort((a, b) => b.length - a.length);
  const parts: Array<{ text: string; mark: boolean }> = [{ text, mark: false }];

  for (const phrase of ordered) {
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const part = parts[i]!;
      if (part.mark) continue;
      const at = part.text.indexOf(phrase);
      if (at === -1) continue;
      parts.splice(
        i,
        1,
        ...[
          { text: part.text.slice(0, at), mark: false },
          { text: phrase, mark: true },
          { text: part.text.slice(at + phrase.length), mark: false },
        ].filter((segment) => segment.text.length > 0),
      );
    }
  }

  return (
    <>
      {parts.map((part, index) =>
        part.mark ? (
          <mark className="rounded bg-impact-soft px-1 text-ink" key={index}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Never changes for the life of the document — the store has no events we need. */
const subscribeToNothing = () => () => {};

/** Dimension labels come from the dictionary so they follow the reader. */
function dimensionLabel(dimension: ScoreDimension, t: Strings): string {
  return {
    practicality: t.dimPracticality,
    socialImpact: t.dimSocialImpact,
    technicalFeasibility: t.dimTechnicalFeasibility,
    financialViability: t.dimFinancialViability,
    novelty: t.dimNovelty,
  }[dimension];
}

export default function VerdictPage() {
  const router = useRouter();
  const [locale] = useLocale();
  const t = stringsFor(locale);
  const [verdict, setVerdict] = useState<VerdictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Stops StrictMode's double-mount from asking the council twice. */
  const requested = useRef(false);

  // See the session page for why this is `useSyncExternalStore` and not a
  // `setState` in an effect.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const stored: StoredSession | null | undefined = hydrated ? getSessionSnapshot() : undefined;

  useEffect(() => {
    if (stored === null) router.replace("/council/new");
  }, [stored, router]);

  const generate = useCallback(async (session: StoredSession) => {
    setError(null);
    try {
      const response = await fetch("/api/council/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: session.brief,
          seatedAgentIds: session.seatedAgentIds,
          transcript: session.transcript,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null;
        throw new Error(
          body?.remedy ? `${body.error} ${body.remedy}` : body?.error ?? "Could not write the verdict.",
        );
      }
      setVerdict((await response.json()) as VerdictResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not write the verdict.");
    }
  }, []);

  useEffect(() => {
    if (!stored || requested.current) return;
    requested.current = true;
    void generate(stored);
  }, [stored, generate]);

  // Order matters: a missing session must not fall into the "generating"
  // branch, or the student watches a spinner promising a verdict that was
  // never going to arrive while the redirect fires underneath it.
  if (stored === undefined) {
    return <p className="py-20 text-center text-sm text-ink-faint">{t.loadingSession}</p>;
  }

  if (stored === null) {
    return (
      <p className="py-20 text-center text-sm text-ink-faint">{t.noSession}</p>
    );
  }

  if (!verdict && !error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              className="size-2 animate-pulse rounded-full bg-navy"
              key={i}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </span>
        <p className="text-sm text-ink-muted">{t.weighing}</p>
      </div>
    );
  }

  if (error || !verdict) {
    return (
      <div className="mx-auto max-w-xl py-20">
        <section className="rounded-lg border border-danger/40 bg-danger-soft/60 p-6 text-center">
          <Icon className="mx-auto text-danger" name="warning" size={28} />
          <h1 className="headline-lg mt-3 text-danger">{t.verdictFailed}</h1>
          <p className="mt-2 text-sm text-danger">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button
              icon="refresh"
              onClick={() => {
                requested.current = true;
                void generate(stored);
              }}
              tone="outline"
            >
              {t.tryAgain}
            </Button>
            <ButtonLink href="/council/session">{t.backToSession}</ButtonLink>
          </div>
        </section>
      </div>
    );
  }

  const credited = localizedAgent(verdict.refinement.creditedAgentId, locale);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeading
        actions={
          <>
            <ButtonLink href="/council/new" tone="outline">
              {t.restart}
            </ButtonLink>
            <ButtonLink href="/impact-hub" icon="download">
              {t.exportReport}
            </ButtonLink>
          </>
        }
        breadcrumb={[t.councilName, t.verdictCrumb]}
        subtitle={stored.brief.title}
        title={t.verdictTitle}
      />

      <Card className="grid gap-8 p-6 md:grid-cols-[auto_1fr] md:gap-10">
        <div className="flex flex-col items-center gap-3 md:border-r md:border-line md:pr-10">
          <p className="text-sm font-semibold text-ink-muted">{t.readiness}</p>
          <ReadinessRing score={verdict.readiness} />
          <Tag
            icon={verdict.readiness >= 60 ? "check-circle" : "alert-circle"}
            tone={verdict.readiness >= 60 ? "impact" : "danger"}
          >
            {verdict.headline}
          </Tag>
        </div>

        <ul className="flex flex-col justify-center gap-5">
          {verdict.scores.map((score) => (
            <li key={score.dimension}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold text-ink">{dimensionLabel(score.dimension, t)}</span>
                <span className="text-lg font-bold text-ink tabular-nums">{score.value}/100</span>
              </div>
              <div className="mt-2 h-2.5 w-full rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${BAR_TONES[score.dimension]}`}
                  style={{ width: `${score.value}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{score.rationale}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-impact bg-impact-wash/60 p-6">
          <h2 className="headline-lg flex items-center gap-2 text-impact-deep">
            <Icon name="thumbs-up" size={22} />
            {t.strengths}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {verdict.strengths.map((item) => (
              <li className="flex gap-3 text-[15px] text-ink" key={item}>
                <Icon className="mt-0.5 shrink-0 text-impact-deep" name="check" size={18} />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-danger/40 bg-danger-soft/60 p-6">
          <h2 className="headline-lg flex items-center gap-2 text-danger">
            <Icon name="warning" size={22} />
            {t.concerns}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {verdict.concerns.map((item) => (
              <li className="flex gap-3 text-[15px] text-danger" key={item}>
                <Icon className="mt-0.5 shrink-0" name="alert-circle" size={18} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {verdict.actions.length ? (
        <Card className="p-6">
          <h2 className="headline-lg text-ink">{t.actions}</h2>
          <p className="mt-2 text-sm text-ink-muted">{t.actionsHint}</p>
          <ol className="mt-5 flex flex-col gap-3">
            {verdict.actions.map((action, index) => (
              <li className="flex gap-3 text-[15px] text-ink" key={action}>
                <span className="mono-data flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-soft text-xs font-bold text-navy">
                  {index + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="headline-lg text-ink">{t.improvementLoop}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t.improvementHint}</p>

        <div className="mt-5 grid overflow-hidden rounded-md border border-line lg:grid-cols-2">
          <div className="bg-card-muted/60 p-5">
            <p className="label-caps text-ink-faint">{t.yourProposal}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-faint">
              {verdict.refinement.original}
            </p>
          </div>

          <div className="border-t border-l-4 border-l-primary bg-navy-soft/40 p-5 lg:border-t-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label-caps text-ink">{t.refinedProposal}</p>
              <Tag tone="navy">{t.creditedTo(credited.name)}</Tag>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-ink">
              <Highlighted
                phrases={verdict.refinement.highlights}
                text={verdict.refinement.refined}
              />
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/collaborate/new" icon="users">
            {t.toTeam}
          </ButtonLink>
          <ButtonLink href="/council/session" tone="outline">
            {t.backToSession}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
