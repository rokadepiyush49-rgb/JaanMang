/**
 * Advances a council session by one agent turn.
 *
 * `POST { brief, seatedAgentIds, transcript, studentMessage? }` → the turn
 * that was just produced, plus who is due next.
 *
 * The session is stateless: the client holds the transcript and posts it back
 * each time. See `lib/council/types.ts` for why there is no session table.
 */

import { NextResponse } from "next/server";
import { GroqError } from "@/lib/council/groq";
import { MissingKeyError, serverEnv } from "@/lib/council/env";
import { advanceSession, studentMessage } from "@/lib/council/orchestrator";
import { sessionProgress } from "@/lib/council/debate-policy";
import {
  parseBrief,
  parseSeatedAgentIds,
  parseStudentMessage,
  parseTranscript,
  ValidationError,
} from "@/lib/council/validate";
import type { ApiError, TurnResponse } from "@/lib/council/types";

/** One model call, retried through a rate limit. 60s is the ceiling it needs. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  let brief, seatedAgentIds, transcript, pending;
  try {
    brief = parseBrief(body.brief);
    seatedAgentIds = parseSeatedAgentIds(body.seatedAgentIds);
    transcript = parseTranscript(body.transcript);
    pending = parseStudentMessage(body.studentMessage);
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        error: error instanceof ValidationError ? error.message : "Malformed request.",
        code: "INVALID_INPUT",
      },
      { status: 400 },
    );
  }

  if (!serverEnv.hasGroqKey) {
    return NextResponse.json<ApiError>(
      {
        error: "The council is not configured yet.",
        code: "MISSING_KEY",
        remedy:
          "Set GROQ_API_KEY in apps/web/.env.local — get a free key at https://console.groq.com/keys",
      },
      { status: 503 },
    );
  }

  // Echoed back with an id so the client can render the student's own turn
  // from the same list as everything else, even though it was never sent to
  // the model as a stored entry.
  const echoed = pending ? studentMessage(pending) : null;

  try {
    const result = await advanceSession(
      { brief, seatedAgentIds, transcript },
      pending,
      request.signal,
    );

    return NextResponse.json<TurnResponse>({
      studentMessage: echoed,
      message: result.message,
      nextSpeakerId: result.nextSpeakerId,
      phase: result.phase,
      progress: result.progress,
      complete: result.complete,
    });
  } catch (error) {
    // The student's interjection is already on screen by the time this fails,
    // so the progress figures have to describe the transcript *including* it —
    // otherwise the UI rolls its own progress bar backwards on an error.
    const progress = sessionProgress({ seatedAgentIds, transcript });

    if (error instanceof MissingKeyError) {
      return NextResponse.json<ApiError>(
        { error: "The council is not configured yet.", code: "MISSING_KEY", remedy: error.message },
        { status: 503 },
      );
    }

    if (error instanceof GroqError && error.isRateLimit) {
      return NextResponse.json<ApiError>(
        {
          error: "The council is speaking faster than the free tier allows. Wait a moment and resume.",
          code: "RATE_LIMITED",
        },
        { status: 429 },
      );
    }

    console.error("[council/turn]", error);
    return NextResponse.json<ApiError & { progress: typeof progress }>(
      {
        error: error instanceof Error ? error.message : "The council could not respond.",
        code: "UPSTREAM_FAILED",
        progress,
      },
      { status: 502 },
    );
  }
}
