"use client";

import { pickVoice, voiceProfileFor, type VoiceProfile } from "@/lib/council/voices";

/**
 * Browser speech engine — the guaranteed fallback path.
 *
 * Deliberately a plain module rather than a React hook: the Web Speech API is
 * a single global queue on `window.speechSynthesis`, so two components each
 * owning their own copy of this state would fight over it. One module talking
 * to one global is the honest shape.
 *
 * `speak()` resolves when the utterance finishes *or* is cancelled, never
 * rejects. Callers use it to pace the session, and a rejected promise there
 * would stall the session on something as ordinary as the founder hitting
 * pause mid-sentence.
 *
 * Everything here is the free, built-in browser synthesizer — no API key, no
 * network call, no per-character cost. `speech-provider.ts` is the seam where
 * a paid provider would slot in later.
 */

/** Chrome silently stops synthesis after ~15s unless it is nudged. */
const KEEPALIVE_INTERVAL_MS = 10_000;

/** Utterances are chunked at sentence boundaries below this length. */
const MAX_CHUNK_CHARS = 220;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/**
 * The voice list is populated asynchronously in Chrome — `getVoices()` returns
 * `[]` on first call and fills in later, announced by `voiceschanged`. Every
 * caller needs to await this before assigning voices or the whole council ends
 * up on the default voice.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);

  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish);
    // Some builds never fire the event when the list is genuinely empty
    // (headless Chrome, a few Linux setups). Don't hang the session on it.
    setTimeout(finish, 2000);
  });
}

/** Resolved voice per speaker id, so a speaker sounds the same all session. */
const assignedVoices = new Map<string, SpeechSynthesisVoice | null>();
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

async function voiceFor(speakerId: string): Promise<SpeechSynthesisVoice | null> {
  if (assignedVoices.has(speakerId)) return assignedVoices.get(speakerId) ?? null;

  voicesReady ??= loadVoices();
  const available = await voicesReady;

  // Re-check: another turn may have resolved the same speaker while we waited.
  if (assignedVoices.has(speakerId)) return assignedVoices.get(speakerId) ?? null;

  const taken = new Set(
    [...assignedVoices.values()].filter((voice): voice is SpeechSynthesisVoice => voice !== null).map((v) => v.voiceURI),
  );
  const profile = voiceProfileFor(speakerId);
  const voice = pickVoice(available, profile, taken);
  assignedVoices.set(speakerId, voice);
  return voice;
}

/**
 * Strips the bits of a transcript message that a synthesizer reads badly.
 *
 * Markdown emphasis becomes literal "asterisk" on some engines, and the
 * currency and arrow glyphs the agents use get read as their Unicode
 * names or skipped entirely. Cheaper to clean the text than to constrain
 * what the model may write.
 */
const MAGNITUDES: Record<string, string> = { k: " thousand", m: " million", b: " billion" };

/**
 * Rewrites "$1.2M" as "1.2 million dollars".
 *
 * Currency sits before its amount in writing and after it in speech, and the
 * magnitude suffix has to travel with the number — replacing the symbol alone
 * left the letter stranded on the amount ("1.2 dollarsM"), which synthesizers
 * read out as a syllable.
 */
function spellCurrency(text: string, escapedSymbol: string, unit: string): string {
  // The space belongs *inside* the optional magnitude group. Left outside it,
  // "€1,250 per seat" ate the space while matching no suffix and came back as
  // "1,250 eurosper seat".
  const pattern = new RegExp(`${escapedSymbol}\\s?([\\d,]+(?:\\.\\d+)?)(?:\\s?([KMB])\\b)?`, "gi");
  return text.replace(pattern, (_match, amount: string, magnitude?: string) => {
    const scale = magnitude ? (MAGNITUDES[magnitude.toLowerCase()] ?? "") : "";
    return `${amount}${scale} ${unit}`;
  });
}

export function speakableText(raw: string): string {
  const currencies: ReadonlyArray<readonly [symbol: string, unit: string]> = [
    ["₹", "rupees"],
    ["\\$", "dollars"],
    ["€", "euros"],
    ["£", "pounds"],
  ];
  const withCurrency = currencies.reduce((text, [symbol, unit]) => spellCurrency(text, symbol, unit), raw);

  return withCurrency
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_#>|]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " link ")
    // Any symbol still here wasn't attached to a number, so `spellCurrency`
    // left it alone — name it in place.
    .replace(/₹/g, " rupees ")
    .replace(/\$/g, " dollars ")
    .replace(/€/g, " euros ")
    .replace(/£/g, " pounds ")
    .replace(/%/g, " percent ")
    .replace(/→|->/g, " to ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits text at sentence boundaries so each utterance stays short.
 *
 * Short utterances matter for two reasons: Chrome's ~15s cutoff is far less
 * likely to bite, and `cancel()` takes effect at the next chunk rather than
 * having to kill a 60-second block mid-word.
 */
function chunk(text: string): string[] {
  // `।` is the Devanagari full stop — without it a Hindi turn is one long
  // utterance, which is exactly what Chrome's ~15s cutoff truncates.
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > MAX_CHUNK_CHARS && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

/** Incremented on every cancel so in-flight utterances know to bail out. */
let generation = 0;
let keepalive: ReturnType<typeof setInterval> | null = null;

function startKeepalive() {
  if (keepalive !== null) return;
  keepalive = setInterval(() => {
    const synth = window.speechSynthesis;
    // `resume()` on an already-playing utterance is a no-op everywhere, but
    // it resets Chrome's internal watchdog — which is the whole trick.
    if (synth.speaking && !synth.paused) synth.resume();
  }, KEEPALIVE_INTERVAL_MS);
}

function stopKeepalive() {
  if (keepalive === null) return;
  clearInterval(keepalive);
  keepalive = null;
}

export interface SpeakOptions {
  /** Roster id, used to keep one voice per agent across the session. */
  speakerId: string;
  /** Overrides the roster profile — used for the founder's own replies. */
  profile?: VoiceProfile;
  onStart?: () => void;
}

/**
 * Speaks `text` and resolves once it finishes or is cancelled.
 *
 * Resolves immediately when speech isn't supported, so callers can await it
 * unconditionally without branching on capability.
 */
export async function speak(text: string, options: SpeakOptions): Promise<void> {
  if (!isSpeechSupported()) return;

  const clean = speakableText(text);
  if (!clean) return;

  const voice = await voiceFor(options.speakerId);
  const profile = options.profile ?? voiceProfileFor(options.speakerId);
  const chunks = chunk(clean);
  const mine = generation;

  // The await above yields, so a cancel may have landed while we were
  // resolving the voice. Speaking now would talk over whatever came next.
  if (mine !== generation) return;

  options.onStart?.();
  startKeepalive();

  try {
    for (const piece of chunks) {
      if (mine !== generation) return;
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(piece);
        if (voice) utterance.voice = voice;
        utterance.pitch = profile.pitch;
        utterance.rate = profile.rate;
        utterance.volume = 1;

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        utterance.onend = finish;
        // A failed utterance must not stall the session — resolve and move on.
        utterance.onerror = finish;

        window.speechSynthesis.speak(utterance);
      });
    }
  } finally {
    // Only the newest speaker tears down the keepalive; an older generation
    // finishing late would otherwise switch it off under the current one.
    if (mine === generation) stopKeepalive();
  }
}

/** Stops everything immediately and unblocks every pending `speak()`. */
export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  generation += 1;
  stopKeepalive();
  window.speechSynthesis.cancel();
}

/**
 * Some browsers only permit synthesis after a user gesture. Speaking a single
 * silent utterance inside a click handler satisfies that, so the first real
 * agent turn isn't swallowed.
 */
export function primeSpeech(): void {
  if (!isSpeechSupported()) return;
  const utterance = new SpeechSynthesisUtterance("");
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
  voicesReady ??= loadVoices();
}
