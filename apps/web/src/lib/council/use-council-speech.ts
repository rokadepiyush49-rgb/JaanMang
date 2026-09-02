"use client";

/**
 * Reads the council's turns aloud.
 *
 * Prefers Edge's neural voices via `/api/council/speech` and drops to the
 * browser's own synthesiser if that fails — see `speech-provider.ts` for why
 * the fallback is load-bearing rather than defensive.
 *
 * Mute is held in memory rather than `localStorage` on purpose: reading a
 * stored preference on mount means either a hydration mismatch or a
 * `setState` inside an effect, and neither is worth it for a toggle that sits
 * in plain view at the top of the session.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isSpeechSupported, primeSpeech } from "@/lib/council/speech-engine";
import { edgeAvailable, speak, stop, type SpeechEngine } from "@/lib/council/speech-provider";

/** Speech support never changes for the life of the document. */
const subscribeToNothing = () => () => {};

export function useCouncilSpeech() {
  const [muted, setMuted] = useState(false);
  /** Roster id of whoever is audibly talking right now. */
  const [voicingId, setVoicingId] = useState<string | null>(null);
  /** Which synthesiser actually spoke last — surfaced so the UI can be honest. */
  const [engine, setEngine] = useState<SpeechEngine>("none");

  // Edge runs server-side, so the browser API is only the *fallback*
  // requirement. Support is true if either path can work — and a fetch is
  // always possible, so this really only gates the "no audio at all" case.
  const browserSupported = useSyncExternalStore(
    subscribeToNothing,
    isSpeechSupported,
    () => false,
  );
  const supported = browserSupported || edgeAvailable();

  // Mute is read inside `speakMessage`, which is a stable callback — a ref
  // keeps it current without rebuilding the callback and re-triggering the
  // session loop that depends on it.
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  /** Aborts the in-flight fetch and playback when the student interrupts. */
  const abortRef = useRef<AbortController | null>(null);

  const stopSpeech = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stop();
    setVoicingId(null);
  }, []);

  // Nothing should keep talking after the student navigates away.
  useEffect(() => stopSpeech, [stopSpeech]);

  const toggleMuted = useCallback(() => {
    setMuted((wasMuted) => {
      if (wasMuted) {
        // Unmuting is a user gesture — the only moment a browser will let us
        // unlock audio. Waste it and the next turn plays silently.
        primeSpeech();
      } else {
        abortRef.current?.abort();
        abortRef.current = null;
        stop();
        setVoicingId(null);
      }
      return !wasMuted;
    });
  }, []);

  /**
   * Primes audio from inside a user gesture without changing mute state.
   * Called from the "start session" click so the first turn is audible.
   */
  const prime = useCallback(() => {
    primeSpeech();
  }, []);

  /**
   * Speaks one message, resolving when it finishes or is interrupted.
   *
   * Resolves immediately when muted, so the session loop can await it
   * unconditionally without branching.
   */
  const speakMessage = useCallback(async (text: string, speakerId: string) => {
    if (mutedRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const used = await speak(
        { text, speakerId, onStart: () => setVoicingId(speakerId) },
        controller.signal,
      );
      if (used !== "none") setEngine(used);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      // Clear only if this speaker still holds the floor — a later turn may
      // already have taken it while this one was being interrupted.
      setVoicingId((current) => (current === speakerId ? null : current));
    }
  }, []);

  return { supported, muted, toggleMuted, voicingId, speakMessage, stop: stopSpeech, engine, prime };
}
