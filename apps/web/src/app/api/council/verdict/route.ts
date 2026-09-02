/**
 * Produces the council's verdict for a finished session.
 *
 * `POST { brief, seatedAgentIds, transcript }` → scores, strengths, concerns,
 * actions and the refined proposal. Stateless like `/api/council/turn`.
 */

import { NextResponse } from "next/server";
import { GroqError } from "@/lib/council/groq";
import { MissingKeyError, serverEnv } from "@/lib/council/env";
import { generateVerdict } from "@/lib/council/verdict";
import {
  parseBrief,
  parseSeatedAgentIds,
  parseTranscript,
  ValidationError,
} from "@/lib/council/validate";
import type { ApiError, VerdictResponse } from "@/lib/council/types";

/** One large structured call over the whole transcript. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  let brief, seatedAgentIds, transcript;
  try {
    brief = parseBrief(body.brief);
    seatedAgentIds = parseSeatedAgentIds(body.seatedAgentIds);
    transcript = parseTranscript(body.transcript);
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

  try {
    const verdict = await generateVerdict(
      { brief, seatedAgentIds, transcript },
      request.signal,
    );
    return NextResponse.json<VerdictResponse>(verdict);
  } catch (error) {
    if (error instanceof MissingKeyError) {
      return NextResponse.json<ApiError>(
        { error: "The council is not configured yet.", code: "MISSING_KEY", remedy: error.message },
        { status: 503 },
      );
    }

    if (error instanceof GroqError && error.isRateLimit) {
      return NextResponse.json<ApiError>(
        {
          error: "Rate limit reached while writing the verdict. Wait a moment and try again.",
          code: "RATE_LIMITED",
        },
        { status: 429 },
      );
    }

    console.error("[council/verdict]", error);
    return NextResponse.json<ApiError>(
      {
        error: error instanceof Error ? error.message : "The verdict could not be written.",
        code: "UPSTREAM_FAILED",
      },
      { status: 502 },
    );
  }
}
