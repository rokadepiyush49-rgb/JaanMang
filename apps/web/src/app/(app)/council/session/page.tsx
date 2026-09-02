"use client";

/**
 * The live council session.
 *
 * Everything here is driven by `useCouncilSession`, which owns the turn loop
 * and the speech. This file is presentation plus the two controls that need to
 * sit inside a user gesture — starting the session and unmuting — because that
 * is the only moment a browser will unlock audio playback.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Button, Tag } from "@/components/ui";
import type { DebatePhase } from "@/lib/council/debate-policy";
import { localizedAgent, type CouncilAgent } from "@/lib/council/roster";
import { LOCALE_TAG, type Locale } from "@/lib/i18n/locale";
import { stringsFor, type Strings } from "@/lib/i18n/strings";
import { useLocale } from "@/lib/i18n/use-locale";
import { getSessionSnapshot, type StoredSession } from "@/lib/council/session-store";
import { useCouncilSession } from "@/lib/council/use-council-session";
import type { CouncilMessage } from "@/lib/council/types";

/** Phase chip label, from the dictionary rather than the engine's own map. */
function phaseTag(phase: DebatePhase, t: Strings): string {
  return phase === "diagnosis" ? t.phaseDiagnosis : phase === "challenge" ? t.phaseChallenge : t.phaseRefinement;
}

const ACCENTS: Record<CouncilAgent["tone"], string> = {
  navy: "border-l-navy",
  impact: "border-l-impact-deep",
  community: "border-l-community",
  muted: "border-l-line-strong",
};

function timeOf(iso: string, locale: Locale) {
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? ""
    : at.toLocaleTimeString(LOCALE_TAG[locale], { hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------------------- Bubble --- */

function Bubble({
  message,
  speaking,
  locale,
  t,
}: {
  message: CouncilMessage;
  speaking: boolean;
  locale: Locale;
  t: Strings;
}) {
  const isStudent = message.kind === "student";
  const agent = isStudent ? null : localizedAgent(message.speakerId, locale);

  return (
    <article className="flex gap-3">
      <Avatar
        name={agent?.personName ?? t.you}
        size={40}
        tone={isStudent ? "community" : agent?.tone === "muted" ? "muted" : agent?.tone ?? "navy"}
      />
      <div
        className={`flex-1 rounded-lg border border-line border-l-4 bg-card p-5 shadow-level1 ${
          isStudent ? "border-l-community" : ACCENTS[agent!.tone]
        } ${speaking ? "ring-2 ring-navy/15" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-ink">{agent?.personName ?? t.you}</h3>
          <Tag tone="neutral">{agent?.name ?? t.proposer}</Tag>
          {speaking ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-navy">
              <Icon name="bot" size={13} />
              {t.speaking}
            </span>
          ) : null}
          <span className="mono-data ml-auto text-ink-faint">{timeOf(message.at, locale)}</span>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
          {message.content}
        </p>

        {message.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.tags.map((tag) => (
              <Tag
                icon={tag.tone === "risk" ? "zap" : "check-circle"}
                key={tag.label}
                tone={tag.tone === "risk" ? "danger" : "neutral"}
              >
                {tag.label}
              </Tag>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------------------------------ Insights panel --- */

/**
 * Each seated agent's running stance, built from what they have actually said.
 *
 * The old version of this page listed two hand-written stances. Deriving them
 * from the transcript means the panel cannot drift from the conversation, and
 * an agent who has not spoken yet is visibly pending rather than silently
 * absent.
 */
function InsightsPanel({
  seatedAgentIds,
  transcript,
  locale,
  t,
}: {
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
  locale: Locale;
  t: Strings;
}) {
  return (
    <div className="mt-5 flex flex-col gap-4">
      {seatedAgentIds.map((id) => {
        const agent = localizedAgent(id, locale);
        const turns = transcript.filter((m) => m.speakerId === id);
        const tags = turns.flatMap((turn) => turn.tags ?? []);
        const risks = tags.filter((tag) => tag.tone === "risk").length;

        if (turns.length === 0) {
          return (
            <div
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong px-6 py-6 text-center"
              key={id}
            >
              <Icon className="text-ink-faint" name={agent.icon} size={22} />
              <p className="text-sm text-ink-faint">{t.notSpokenYet(agent.personName)}</p>
            </div>
          );
        }

        return (
          <section
            className={`rounded-lg border border-line border-l-4 bg-card p-5 shadow-level1 ${ACCENTS[agent.tone]}`}
            key={id}
          >
            <h3 className="flex items-center gap-2 font-bold text-ink">
              <Icon className="text-navy" name={agent.icon} size={19} />
              {agent.personName}
            </h3>
            <p className="mt-1 text-xs text-ink-faint">{agent.name}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Tag tone="neutral">{t.turnCount(turns.length)}</Tag>
              {risks > 0 ? <Tag tone="danger">{t.flagCount(risks)}</Tag> : null}
            </div>

            {tags.length ? (
              <ul className="mt-4 flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed marker:text-ink-faint">
                {tags.map((tag, index) => (
                  <li
                    className={tag.tone === "risk" ? "text-danger" : "text-ink"}
                    key={`${tag.label}-${index}`}
                  >
                    {tag.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Page --- */

/** Never changes for the life of the document — the store has no events we need. */
const subscribeToNothing = () => () => {};

export default function CouncilSessionPage() {
  const router = useRouter();
  const [locale] = useLocale();
  const t = stringsFor(locale);

  /**
   * `sessionStorage` does not exist during the server render, so the stored
   * session has to arrive after hydration or every load is a mismatch. This is
   * the `useSyncExternalStore` shape rather than a `setState` in an effect:
   * the server snapshot is `false`, the client snapshot is `true`, and React
   * swaps them in one pass instead of a cascading re-render.
   */
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const stored: StoredSession | null | undefined = hydrated ? getSessionSnapshot() : undefined;

  useEffect(() => {
    if (stored === null) router.replace("/council/new");
  }, [stored, router]);

  if (stored === undefined) {
    return (
      <p className="py-20 text-center text-sm text-ink-faint">{t.loadingSession}</p>
    );
  }
  if (stored === null) {
    return (
      <p className="py-20 text-center text-sm text-ink-faint">{t.noSession}</p>
    );
  }

  return <LiveSession stored={stored} />;
}

function LiveSession({ stored }: { stored: StoredSession }) {
  const [locale] = useLocale();
  const t = stringsFor(locale);
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  const session = useCouncilSession({
    brief: stored.brief,
    seatedAgentIds: stored.seatedAgentIds,
    initialTranscript: stored.transcript,
    initialComplete: stored.complete,
  });

  const { status, speech, transcript } = session;
  const running = status === "running";

  // Follow the conversation as it arrives. `scrollTop` rather than
  // `scrollIntoView` so this never scrolls the whole page under the student.
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [transcript.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    session.interject(text);
    setDraft("");
  }

  const waitingFor = session.nextSpeakerId ? localizedAgent(session.nextSpeakerId, locale) : null;
  const percent = Math.round(session.progress.fraction * 100);
  // Resolved here rather than inside the hook so the name follows the reader's
  // language even when the transcript itself was produced in the other one.
  const activeName = session.activeAgentId
    ? localizedAgent(session.activeAgentId, locale).personName
    : null;

  return (
    <div className="mx-auto -my-8 flex max-w-7xl flex-col xl:h-[calc(100vh-4.5rem)] xl:flex-row">
      {/* Transcript column */}
      <div className="flex min-w-0 flex-1 flex-col border-line xl:border-r">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <span
            className={`size-2.5 rounded-full ${
              running ? "animate-pulse bg-impact-deep" : status === "complete" ? "bg-navy" : "bg-community"
            }`}
          />
          <p className="text-sm font-bold text-ink">
            {status === "running"
              ? t.statusRunning
              : status === "complete"
                ? t.statusComplete
                : status === "error"
                  ? t.statusError
                  : status === "paused"
                    ? t.statusPaused
                    : t.statusIdle}
          </p>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <p className="hidden truncate text-sm text-ink-muted sm:block">
            {status === "running" && activeName
              ? t.hasTheFloor(activeName)
              : status === "idle"
                ? t.hintIdle
                : status === "paused"
                  ? t.hintPaused
                  : status === "complete"
                    ? t.hintComplete
                    : ""}
          </p>

          <div className="ml-auto flex items-center gap-2">
            {session.phase ? <Tag tone="navy">{phaseTag(session.phase, t)}</Tag> : null}
            <Tag tone="neutral">
              {t.turnsOf(session.progress.turnsTaken, session.progress.turnsPlanned)}
            </Tag>
            {speech.supported ? (
              <button
                aria-label={speech.muted ? t.unmute : t.mute}
                aria-pressed={speech.muted}
                className="flex size-9 items-center justify-center rounded-[0.5rem] border border-line text-ink-muted hover:bg-card-muted"
                onClick={speech.toggleMuted}
                type="button"
              >
                <Icon name={speech.muted ? "volume-off" : "volume-on"} size={17} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="h-1 w-full bg-line">
          <div
            className="h-full bg-impact-deep transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6" ref={feedRef}>
          <p className="mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-center text-sm text-ink-muted">
            <Icon name="alert-circle" size={16} />
            {stored.brief.title}
          </p>

          {transcript.length === 0 && status === "idle" ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
              <Icon className="text-ink-faint" name="users" size={30} />
              <p className="text-sm text-ink-muted">
                {t.seatedReady(stored.seatedAgentIds.length)}
              </p>
              <Button icon="sparkles" onClick={session.start} size="lg">
                {t.begin}
              </Button>
            </div>
          ) : null}

          {transcript.map((message) => (
            <Bubble
              key={message.id}
              locale={locale}
              message={message}
              speaking={speech.voicingId === message.speakerId && message.kind === "agent"}
              t={t}
            />
          ))}

          {running && waitingFor && !speech.voicingId ? (
            <div className="flex items-center gap-3">
              <Avatar name={waitingFor.personName} size={40} tone="muted" />
              <p className="flex items-center gap-3 rounded-full border border-line bg-card px-5 py-3 text-sm text-ink-faint">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      className="size-1.5 animate-pulse rounded-full bg-ink-faint"
                      key={i}
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </span>
                {t.isThinking(waitingFor.personName)}
              </p>
            </div>
          ) : null}

          {session.error ? (
            <div className="rounded-lg border border-danger/40 bg-danger-soft/60 p-5">
              <h3 className="flex items-center gap-2 font-bold text-danger">
                <Icon name="warning" size={18} />
                {t.stopped}
              </h3>
              <p className="mt-2 text-sm text-danger">{session.error}</p>
              <Button className="mt-4" icon="refresh" onClick={session.retry} size="sm" tone="outline">
                {t.tryAgain}
              </Button>
            </div>
          ) : null}
        </div>

        <form className="border-t border-line bg-surface px-5 py-4" onSubmit={submit}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 rounded-md border border-line bg-card p-3 focus-within:border-navy">
              <label>
                <span className="sr-only">{t.replyLabel}</span>
                <textarea
                  className="w-full resize-none text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                  disabled={status === "complete"}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    status === "complete" ? t.replyEnded : t.replyPlaceholder
                  }
                  rows={2}
                  value={draft}
                />
              </label>
              <p className="mt-2 text-xs text-ink-faint">
                {speech.engine === "browser"
                  ? t.voiceBrowser
                  : speech.engine === "edge"
                    ? t.voiceNeural
                    : t.voiceIdle}
              </p>
            </div>

            <div className="flex gap-2">
              {status === "idle" ? (
                <Button icon="sparkles" onClick={session.start} type="button">
                  {t.start}
                </Button>
              ) : status === "complete" ? null : (
                <Button
                  aria-label={running ? t.pause : t.resume}
                  className="!px-3"
                  onClick={running ? session.pause : session.resume}
                  tone="outline"
                  type="button"
                >
                  <Icon name={running ? "pause" : "refresh"} size={18} />
                </Button>
              )}
              <Button disabled={!draft.trim() || status === "complete"} iconAfter="send" type="submit">
                {t.submit}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Insights column */}
      <aside className="w-full shrink-0 overflow-y-auto border-t border-line bg-surface px-5 py-6 xl:w-96 xl:border-t-0">
        <div className="flex items-center justify-between">
          <h2 className="headline-lg text-ink">{t.insights}</h2>
          <Icon className="text-ink-faint" name="arrow-up-right" size={18} />
        </div>

        <InsightsPanel locale={locale} seatedAgentIds={stored.seatedAgentIds} t={t} transcript={transcript} />

        <Link
          aria-disabled={status !== "complete"}
          className={`mt-4 flex h-12 items-center justify-center gap-2 rounded-[0.5rem] text-sm font-semibold transition-colors ${
            status === "complete"
              ? "bg-primary text-white hover:bg-navy"
              : "pointer-events-none bg-card-muted text-ink-faint"
          }`}
          href="/council/verdict"
        >
          {status === "complete" ? t.viewVerdict : t.verdictLocked}
          <Icon name="arrow-right" size={18} />
        </Link>
      </aside>
    </div>
  );
}
