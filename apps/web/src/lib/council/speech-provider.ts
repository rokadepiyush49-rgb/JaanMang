"use client";

/**
 * Chooses how the council speaks.
 *
 * Two providers, in order of preference:
 *
 *   1. Edge neural voices, fetched from `/api/council/speech`. Free, good, and
 *      the same voice id sounds the same on every machine — so the council
 *      sounds identical on your laptop and on a judge's screen.
 *   2. The browser's own Web Speech API. Robotic and OS-dependent, but it
 *      cannot fail in a way that leaves the council silent.
 *
 * The fallback chain is the whole point of this file. Edge may be blocked by a
 * conference network, and its endpoint is one Microsoft does not publish. When
 * it fails, the student should notice a change in voice quality and nothing
 * else.
 *
 * Once Edge has failed, this stops trying it for the rest of the session.
 * Retrying per turn would add the full 12-second timeout to every turn of a
 * session that is already paced by a rate limit.
 *
 * Adapted from BoardroomAI-2.0 (`lib/speech/speech-provider.ts`), with the
 * self-hosted Piper tier dropped — it needs a vendored binary and downloaded
 * models, which is not a trade this app should make for a third voice option.
 */

import { cancelSpeech, isSpeechSupported, speak as speakLocally } from "@/lib/council/speech-engine";
import type { VoiceProfile } from "@/lib/council/voices";

export type SpeechEngine = "edge" | "browser" | "none";

/** Set once Edge has failed, so the rest of the session skips straight to the browser. */
let edgeDisabled = false;

/** The element currently playing Edge audio, so it can be stopped mid-word. */
let currentAudio: HTMLAudioElement | null = null;
/** Object URL behind `currentAudio`, revoked on cleanup to avoid a leak. */
let currentObjectUrl: string | null = null;

function releaseAudio() {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

/** True when Edge is still worth trying. */
export function edgeAvailable(): boolean {
  return !edgeDisabled;
}

/** Forces the browser path — used by tests and by an explicit user setting. */
export function disableEdge() {
  edgeDisabled = true;
}

export interface SpeakRequest {
  text: string;
  /** Roster id, or "student". Picks the voice on both paths. */
  speakerId: string;
  /** Overrides the roster profile on the browser path. */
  profile?: VoiceProfile;
  onStart?: () => void;
}

/**
 * Fetches and plays audio from the server engine. Resolves when playback
 * finishes.
 *
 * Rejects on any failure so `speak` can fall through — the caller must not be
 * able to tell the difference except by the voice.
 */
async function speakViaServer(
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/council/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) throw new Error(`Speech unavailable (${response.status})`);

  const blob = await response.blob();
  if (blob.size === 0) throw new Error("Speech returned empty audio.");
  if (signal.aborted) throw new Error("Aborted.");

  releaseAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  currentObjectUrl = url;

  await new Promise<void>((resolve, reject) => {
    const done = () => {
      releaseAudio();
      resolve();
    };
    audio.onended = done;
    audio.onerror = () => {
      releaseAudio();
      reject(new Error("Playback failed."));
    };
    signal.addEventListener("abort", done, { once: true });

    // Autoplay can be blocked when no user gesture has unlocked audio yet.
    // That is a browser-path problem too, so treat it as a normal failure and
    // let the fallback try rather than surfacing it.
    audio.play().catch(() => {
      releaseAudio();
      reject(new Error("Audio playback was blocked."));
    });
  });
}

/**
 * Speaks one message and resolves when it finishes or is cancelled.
 *
 * Never rejects: callers use this to pace the session, and a rejection would
 * stall it on something as ordinary as a blocked autoplay.
 *
 * Returns which engine actually spoke, so the UI can be honest about it.
 */
export async function speak(request: SpeakRequest, signal: AbortSignal): Promise<SpeechEngine> {
  if (!request.text.trim()) return "none";

  // Fired exactly once, whichever engine ends up speaking. Firing it per
  // attempt would flicker the speaking indicator as the chain falls through.
  let announced = false;
  const announce = () => {
    if (announced) return;
    announced = true;
    request.onStart?.();
  };

  if (!edgeDisabled) {
    try {
      announce();
      await speakViaServer({ text: request.text, agentId: request.speakerId }, signal);
      return "edge";
    } catch {
      // A network that blocks this once will block it every turn, and paying
      // the timeout on all eighteen would be worse than the robotic voice.
      if (signal.aborted) return "none";
      edgeDisabled = true;
    }
  }

  if (!isSpeechSupported()) return "none";

  await speakLocally(request.text, {
    speakerId: request.speakerId,
    ...(request.profile ? { profile: request.profile } : {}),
    ...(announced ? {} : { onStart: announce }),
  });
  return "browser";
}

/** Stops whichever engine is talking. */
export function stop() {
  releaseAudio();
  cancelSpeech();
}
