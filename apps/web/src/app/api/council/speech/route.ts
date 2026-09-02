/**
 * Speaks one transcript turn in a council member's own voice.
 *
 * `POST { agentId, text }` → MP3 bytes.
 *
 * ## Failure is not an error here
 *
 * Edge synthesis is best-effort by design (see `lib/council/edge-tts.ts`).
 * When it fails this answers 503, which the client reads as "use the
 * browser's own voice for the rest of the session" — a quieter council, never
 * a broken one. That is why the client must not treat a non-OK response as
 * something to surface to the student.
 *
 * ## No auth, and what that costs
 *
 * The rest of this app has no auth to hang this off, so this endpoint is
 * open. That makes it free synthesis for anyone who finds it, bounded only by
 * `MAX_CHARS` and by the upstream service. Acceptable for a demo deployment;
 * if this app ever grows a session or a user, gate this route on it.
 */

import { NextResponse } from "next/server";
import { EdgeTtsError, synthesise } from "@/lib/council/edge-tts";
import { isKnownVoice } from "@/lib/council/voices";
import type { ApiError } from "@/lib/council/types";

/** A raw WebSocket needs the Node runtime; it does not exist on edge. */
export const runtime = "nodejs";

/** Synthesis is quick, but a long turn needs headroom over the 12s internal cap. */
export const maxDuration = 30;

/**
 * A turn is capped at ~280 output tokens upstream, so anything beyond this is
 * not a council turn — it is someone using the endpoint as a free TTS API.
 */
const MAX_CHARS = 1_200;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    agentId?: unknown;
    text?: unknown;
  };

  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : "";
  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";

  if (!text) {
    return NextResponse.json<ApiError>(
      { error: "Nothing to speak.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  // An unknown id is not rejected — it falls back to the default voice, so a
  // renamed agent is still audible. Reporting it in a header keeps the silent
  // substitution debuggable.
  const recognised = isKnownVoice(agentId);

  try {
    const audio = await synthesise(text, agentId);

    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
        ...(recognised ? {} : { "X-Council-Fallback-Voice": "true" }),
        // Deterministic for a given agent + text, and not user-specific: the
        // same line in the same voice is the same bytes for everyone.
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (error) {
    // 503 rather than 500: this is "the upgrade is unavailable, use the
    // fallback", not "something is broken".
    const status = error instanceof EdgeTtsError ? 503 : 500;
    return NextResponse.json<ApiError>(
      {
        error: error instanceof Error ? error.message : "Speech synthesis failed.",
        code: "TTS_FAILED",
        remedy: "The council will speak with the browser's built-in voice instead.",
      },
      { status },
    );
  }
}
