/**
 * Microsoft Edge text-to-speech, spoken over its WebSocket protocol.
 *
 * ## What this is, honestly
 *
 * This is the endpoint Edge's "Read Aloud" feature calls. Microsoft does not
 * publish it as a public API, which means two things worth stating plainly:
 * it can change without notice, and it should be treated as best-effort
 * rather than a dependency. Everything downstream — `app/api/council/speech/route.ts`
 * and the client hook — is built so that a failure here degrades silently to
 * the browser's own Web Speech API rather than leaving the council mute.
 *
 * The upside is real enough to justify the seam: these are neural voices,
 * they cost nothing, and — unlike the Web Speech API — the same voice id
 * produces the same voice on every machine, so the council sounds identical
 * on a laptop and on a judge's screen.
 *
 * ## The protocol
 *
 * 1. Open a WebSocket with a trusted-client token and a time-derived
 *    `Sec-MS-GEC` signature.
 * 2. Send a JSON config frame declaring the output audio format.
 * 3. Send an SSML frame.
 * 4. Read binary frames. Each carries a small header followed by MP3 bytes;
 *    the stream ends with a `turn.end` text frame.
 *
 * Server-only — it opens a raw WebSocket.
 *
 * Ported from BoardroomAI-2.0 (`lib/speech/edge-tts.ts`); the protocol handling
 * is unchanged, only the voice lookup and the naming are ours.
 *
 * ## Known to be failing as of 2026-09-02
 *
 * Every handshake from this project's network is answered `403`, including
 * the unsigned `TrustedClientToken`-only form that used to work and every
 * `Sec-MS-GEC-Version` from 130 through 140. Either Microsoft has tightened
 * the endpoint or it is blocked for this region (the rejection came back via
 * their Pune edge node). This tier is kept because it costs exactly one
 * failed request per session — `speech-provider.ts` disables it after the
 * first failure — and because it may well work from another network. The
 * council speaks through the browser's own voices either way; see
 * `speech-provider.ts` for the chain.
 */

import "server-only";

import { createHash } from "node:crypto";
import { edgeVoiceFor } from "@/lib/council/voices";

/** Public constant shipped in Edge itself, not a secret. */
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

const ENDPOINT =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";

/** Ticks between 1601-01-01 (Windows epoch) and 1970-01-01 (Unix epoch). */
const WINDOWS_EPOCH_OFFSET_SECONDS = 11_644_473_600;

/**
 * The whole synthesis must beat this or we fall back.
 *
 * A turn is already waiting on a model call; adding an unbounded audio wait
 * in front of playback means one slow synthesis stalls the session. Past
 * this the client speaks with the browser voice instead.
 */
const SYNTHESIS_TIMEOUT_MS = 12_000;

/**
 * Builds the `Sec-MS-GEC` signature.
 *
 * SHA-256 of the current Windows file time — rounded down to a 5-minute
 * window — concatenated with the trusted client token, uppercased. The
 * rounding is what lets client and server agree without a handshake, and is
 * also why a machine with a badly wrong clock cannot authenticate.
 */
function generateSecMsGec(): string {
  const nowSeconds = Math.floor(Date.now() / 1000) + WINDOWS_EPOCH_OFFSET_SECONDS;
  const rounded = nowSeconds - (nowSeconds % 300);

  // File time is in 100-nanosecond intervals, so this is `rounded × 10^7` —
  // about 1.3e17, well past `Number.MAX_SAFE_INTEGER`. The upstream version
  // uses a BigInt, but this project targets ES2017 where BigInt literals are
  // not available. Multiplying by a power of ten only appends zeros in
  // decimal, and `rounded` is an integer far below the 1e21 threshold where
  // JS switches to exponential notation — so appending the seven zeros as
  // text produces exactly the same digits with no precision to lose.
  const ticks = `${rounded}0000000`;

  return createHash("sha256")
    .update(`${ticks}${TRUSTED_CLIENT_TOKEN}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

/** XML-escapes text so a stray ampersand cannot break the SSML document. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text: string, agentId: string): string {
  const voice = edgeVoiceFor(agentId);
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice.name}'>` +
    `<prosody rate='${voice.rate}' pitch='${voice.pitch}'>${escapeXml(text)}</prosody>` +
    `</voice></speak>`
  );
}

function connectionId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Splits the binary frame into its header and audio payload.
 *
 * Each frame is `<2-byte big-endian header length><header text><audio>`.
 * Returning null for a frame whose header is not an audio header is how
 * metadata frames are skipped without corrupting the MP3 stream.
 */
function audioFromFrame(frame: Buffer): Buffer | null {
  if (frame.length < 2) return null;
  const headerLength = frame.readUInt16BE(0);
  if (headerLength + 2 > frame.length) return null;
  const header = frame.subarray(2, 2 + headerLength).toString("utf8");
  // The path must terminate, not merely start with "audio". `Path:audio.metadata`
  // contains `Path:audio` as a substring, so a plain `includes` check appended
  // metadata JSON straight into the MP3 buffer — audible as a burst of noise
  // and invisible in any log.
  if (!/Path:audio\r?\n/.test(header)) return null;
  return frame.subarray(2 + headerLength);
}

/**
 * Internals exposed for tests.
 *
 * The WebSocket handshake cannot be exercised without network access, so
 * these are the pieces worth asserting on: a malformed SSML document or a
 * mis-parsed frame header would produce silence or noise, and both are hard
 * to diagnose from the client side.
 */
export const __internals = { buildSsml, audioFromFrame, generateSecMsGec, escapeXml };

export class EdgeTtsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EdgeTtsError";
  }
}

/**
 * Synthesises `text` in `agentId`'s voice and resolves to MP3 bytes.
 *
 * Throws rather than returning empty on failure, so the route can answer
 * with a status the client reads as "use the browser voice instead".
 */
export async function synthesise(text: string, agentId: string): Promise<Buffer> {
  const trimmed = text.trim();
  if (!trimmed) throw new EdgeTtsError("Nothing to speak.");

  const url =
    `${ENDPOINT}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=1-130.0.2849.68`;

  // `WebSocket` is global in Node 22 and on the edge runtime, so no `ws`
  // dependency is needed — one less package to keep in step with a protocol
  // that is not ours to begin with.
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (error: Error | null, audio?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Closing an already-closed socket is not an error worth surfacing.
      }
      if (error) reject(error);
      else resolve(audio!);
    };

    const timer = setTimeout(
      () => finish(new EdgeTtsError("Edge TTS timed out.")),
      SYNTHESIS_TIMEOUT_MS,
    );

    socket.onopen = () => {
      const timestamp = new Date().toISOString();
      const id = connectionId();

      socket.send(
        `X-Timestamp:${timestamp}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                },
              },
            },
          }),
      );

      socket.send(
        `X-RequestId:${id}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${timestamp}Z\r\n` +
          `Path:ssml\r\n\r\n` +
          buildSsml(trimmed, agentId),
      );
    };

    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        // The stream is finished when the service ends the turn.
        if (event.data.includes("Path:turn.end")) {
          if (chunks.length === 0) finish(new EdgeTtsError("Edge TTS returned no audio."));
          else finish(null, Buffer.concat(chunks));
        }
        return;
      }
      const audio = audioFromFrame(Buffer.from(event.data as ArrayBuffer));
      if (audio?.length) chunks.push(audio);
    };

    socket.onerror = () => finish(new EdgeTtsError("Edge TTS connection failed."));

    socket.onclose = () => {
      // A close before `turn.end` with audio in hand is still usable; with
      // nothing buffered it is a failure the caller must be told about.
      if (chunks.length > 0) finish(null, Buffer.concat(chunks));
      else finish(new EdgeTtsError("Edge TTS closed before sending audio."));
    };
  });
}
