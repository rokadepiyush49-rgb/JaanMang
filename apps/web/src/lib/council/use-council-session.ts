"use client";

/**
 * Drives a live council session: request a turn, speak it, request the next.
 *
 * ## Why a ref-driven loop rather than an effect chain
 *
 * The obvious React shape — an effect that fires whenever the transcript
 * changes and requests the next turn — reads well and behaves badly. It
 * re-runs on any unrelated state change, it double-fires under StrictMode,
 * and pausing means racing a scheduled effect. A single `while` loop guarded
 * by one ref has exactly one place where the session advances and one place
 * where it stops, which is worth more here than idiomatic effect usage.
 *
 * `transcriptRef` is the source of truth; React state mirrors it for
 * rendering. The loop must read the transcript it is about to send *now*, and
 * a state variable captured in a closure is a turn behind by construction.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCouncilSpeech } from "@/lib/council/use-council-speech";
import { getAgent } from "@/lib/council/roster";
import { writeSession } from "@/lib/council/session-store";
import type {
  ApiError,
  CouncilMessage,
  DebatePhase,
  ProjectBrief,
  SessionProgress,
  TurnResponse,
} from "@/lib/council/types";

/**
 * Minimum spacing between turns.
 *
 * Groq's free tier meters tokens per minute, and a session is ~18 back-to-back
 * requests. When the council is speaking aloud the audio paces it naturally —
 * a four-sentence turn takes far longer to say than to generate — so this only
 * bites when muted, which is exactly when a session would otherwise sprint
 * straight into a 429.
 */
const MIN_TURN_GAP_MS = 2_500;

export type SessionStatus = "idle" | "running" | "paused" | "complete" | "error";

export interface CouncilSessionInput {
  brief: ProjectBrief;
  seatedAgentIds: string[];
  /** Restored from a previous visit to this page, if any. */
  initialTranscript?: CouncilMessage[];
  initialComplete?: boolean;
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function useCouncilSession(input: CouncilSessionInput) {
  const { brief, seatedAgentIds } = input;
  const speech = useCouncilSpeech();

  const [confirmed, setConfirmed] = useState<CouncilMessage[]>(input.initialTranscript ?? []);
  const [status, setStatus] = useState<SessionStatus>(input.initialComplete ? "complete" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<DebatePhase | null>(null);
  const [nextSpeakerId, setNextSpeakerId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SessionProgress>({
    turnsTaken: input.initialTranscript?.filter((m) => m.kind === "agent").length ?? 0,
    turnsPlanned: seatedAgentIds.length * 3,
    fraction: 0,
  });

  /**
   * What the student has typed but the council has not yet heard.
   *
   * Held apart from the confirmed transcript rather than appended to it. It is
   * rendered immediately so typing feels like talking, but it must *not* be in
   * the array posted as `transcript` — it also travels as `studentMessage`, and
   * an entry in both places is a council that hears the same sentence twice.
   * The server echoes it back with a canonical id, and that copy is what lands
   * in `confirmed`.
   */
  const [pendingText, setPendingText] = useState<string | null>(null);

  const transcriptRef = useRef<CouncilMessage[]>(input.initialTranscript ?? []);
  /** True while the loop should keep going. Cleared by pause, error and unmount. */
  const activeRef = useRef(false);
  /** Guards against two loops running at once (StrictMode, double-click). */
  const loopRef = useRef(false);
  /** The student's next interjection, consumed by the turn after this one. */
  const pendingRef = useRef<string | null>(null);
  /** Aborts the in-flight fetch when the student pauses or leaves. */
  const abortRef = useRef<AbortController | null>(null);
  const completeRef = useRef(input.initialComplete ?? false);

  // `speakMessage` is stable, but reading it through a ref keeps the loop from
  // depending on the speech hook's identity at all.
  const speakRef = useRef(speech.speakMessage);
  useEffect(() => {
    speakRef.current = speech.speakMessage;
  }, [speech.speakMessage]);

  const stopSpeechRef = useRef(speech.stop);
  useEffect(() => {
    stopSpeechRef.current = speech.stop;
  }, [speech.stop]);

  const primeRef = useRef(speech.prime);
  useEffect(() => {
    primeRef.current = speech.prime;
  }, [speech.prime]);

  // Nothing should keep requesting turns after the student navigates away.
  useEffect(
    () => () => {
      activeRef.current = false;
      abortRef.current?.abort();
    },
    [],
  );

  const runLoop = useCallback(async () => {
    if (loopRef.current || completeRef.current) return;
    loopRef.current = true;
    activeRef.current = true;
    setError(null);
    setStatus("running");

    try {
      while (activeRef.current && !completeRef.current) {
        const startedAt = Date.now();
        const controller = new AbortController();
        abortRef.current = controller;

        const studentMessage = pendingRef.current;
        pendingRef.current = null;

        let data: TurnResponse;
        try {
          const response = await fetch("/api/council/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brief,
              seatedAgentIds,
              transcript: transcriptRef.current,
              ...(studentMessage ? { studentMessage } : {}),
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as ApiError | null;
            throw new Error(
              body?.remedy
                ? `${body.error} ${body.remedy}`
                : body?.error ?? `Request failed (${response.status})`,
            );
          }
          data = (await response.json()) as TurnResponse;
        } catch (fetchError) {
          // An abort is a pause or a navigation, not a failure to report.
          if (controller.signal.aborted) return;
          // The interjection never reached the council, so put it back rather
          // than silently dropping what the student typed.
          if (studentMessage) pendingRef.current = studentMessage;
          setError(
            fetchError instanceof Error ? fetchError.message : "The council could not respond.",
          );
          setStatus("error");
          activeRef.current = false;
          return;
        }

        if (!activeRef.current) return;

        const added = [data.studentMessage, data.message].filter(
          (message): message is CouncilMessage => message !== null,
        );
        if (added.length) {
          transcriptRef.current = [...transcriptRef.current, ...added];
          setConfirmed(transcriptRef.current);
          writeSession({
            brief,
            seatedAgentIds,
            transcript: transcriptRef.current,
            complete: data.complete,
          });
        }
        // The echoed copy is now in `confirmed`, so the optimistic one can go.
        if (data.studentMessage) setPendingText(null);

        setProgress(data.progress);
        setPhase(data.phase);
        setNextSpeakerId(data.nextSpeakerId);

        if (data.message) {
          // Awaited so the next turn does not talk over this one. Resolves
          // immediately when muted or when speech is unavailable.
          await speakRef.current(data.message.content, data.message.speakerId);
        }

        if (data.complete) {
          completeRef.current = true;
          activeRef.current = false;
          setStatus("complete");
          setNextSpeakerId(null);
          return;
        }

        if (!activeRef.current) return;

        // Only sleeps when generation plus speech came in under the floor,
        // which in practice means the council is muted.
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_TURN_GAP_MS) {
          await sleep(MIN_TURN_GAP_MS - elapsed, controller.signal);
        }
      }
    } finally {
      loopRef.current = false;
      abortRef.current = null;
      // `activeRef` is already false for pause, error and completion alike, so
      // only a run that fell out of the loop still needs its status corrected.
      setStatus((current) => (current === "running" ? "paused" : current));
    }
  }, [brief, seatedAgentIds]);

  const start = useCallback(() => {
    // Unlocking audio has to happen inside the click that starts the session,
    // or the browser swallows the first turn.
    primeRef.current();
    void runLoop();
  }, [runLoop]);

  const pause = useCallback(() => {
    activeRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    stopSpeechRef.current();
    setStatus("paused");
  }, []);

  const retry = useCallback(() => {
    setError(null);
    void runLoop();
  }, [runLoop]);

  /**
   * Queues the student's reply for the next turn, and gets the council moving
   * if it was paused — pressing Submit and watching nothing happen is not a
   * state worth having.
   */
  const interject = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || completeRef.current) return;
      pendingRef.current = trimmed;
      setPendingText(trimmed);
      primeRef.current();
      void runLoop();
    },
    [runLoop],
  );

  /** Confirmed turns plus whatever the student has typed but not yet sent. */
  const transcript = useMemo<CouncilMessage[]>(() => {
    if (!pendingText) return confirmed;
    return [
      ...confirmed,
      {
        id: "pending-student",
        speakerId: "student",
        kind: "student",
        content: pendingText,
        at: new Date().toISOString(),
      },
    ];
  }, [confirmed, pendingText]);

  /** Who is speaking, or who is being waited on, for the status line. */
  const activeAgentId = speech.voicingId ?? nextSpeakerId;

  return {
    transcript,
    status,
    error,
    phase,
    progress,
    nextSpeakerId,
    activeAgentId,
    activeAgentName: activeAgentId ? getAgent(activeAgentId).personName : null,
    start,
    pause,
    resume: start,
    retry,
    interject,
    speech,
  };
}
