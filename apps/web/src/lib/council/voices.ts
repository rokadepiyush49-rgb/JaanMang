/**
 * How each council member sounds.
 *
 * Two independent mappings, because the two synthesis paths have nothing in
 * common:
 *
 *   - `edgeVoices` names a Microsoft neural voice. These ids are stable, so
 *     the council sounds identical on your laptop and on a judge's screen.
 *     This is the path we want.
 *   - `voiceProfiles` describes the *character* a voice should have, for the
 *     browser's Web Speech API — which hands back whatever the operating
 *     system happens to have installed, so a voice cannot be named directly.
 *
 * Accents are deliberate rather than decorative. This council reviews civic
 * proposals written in Indian English, by students, about Indian districts;
 * six American voices would undercut the roster we wrote. Kavita and Arjun
 * take the two long-established `en-IN` neural voices — newer `en-IN` ids
 * exist but are not reliably available, and an unavailable voice costs a
 * failed synthesis and a drop to the browser's robot.
 *
 * Keep this file free of server-only imports; the client reads it to decide
 * which voice to request.
 */

// ---- Edge neural voices ---------------------------------------------------

export interface EdgeVoice {
  /** Microsoft voice id, e.g. "en-IN-NeerjaNeural". */
  name: string;
  /** SSML prosody rate, e.g. "+8%". Tuned per persona. */
  rate: string;
  /** SSML prosody pitch, e.g. "-4Hz". */
  pitch: string;
}

/**
 * Keyed by agent id from `roster.ts`.
 *
 * Chosen for character, not just gender: Rohan is the council's most
 * conservative voice and reads low and slow; Arjun is brisk because he is
 * always the one saying this will not ship in time; Fatima is measured and
 * precise. Even where two agents shared an underlying voice, the prosody
 * offsets would keep them apart by ear — which is the whole point of speaking
 * the session aloud rather than just showing who has the floor.
 */
export const edgeVoices: Record<string, EdgeVoice> = {
  citizen:   { name: "en-IN-NeerjaNeural",      rate: "-2%",  pitch: "+2Hz" },
  technical: { name: "en-IN-PrabhatNeural",     rate: "+8%",  pitch: "+0Hz" },
  financial: { name: "en-US-GuyNeural",         rate: "-6%",  pitch: "-4Hz" },
  legal:     { name: "en-GB-LibbyNeural",       rate: "-4%",  pitch: "+0Hz" },
  ip:        { name: "en-US-MichelleNeural",    rate: "-1%",  pitch: "+3Hz" },
  industry:  { name: "en-US-ChristopherNeural", rate: "+3%",  pitch: "-2Hz" },
};

export const DEFAULT_EDGE_VOICE: EdgeVoice = {
  name: "en-IN-NeerjaNeural",
  rate: "+0%",
  pitch: "+0Hz",
};

/** The student's own words, when read back. Deliberately neutral. */
export const STUDENT_EDGE_VOICE: EdgeVoice = {
  name: "en-IN-PrabhatNeural",
  rate: "+2%",
  pitch: "+0Hz",
};

export function edgeVoiceFor(agentId: string): EdgeVoice {
  if (agentId === "student") return STUDENT_EDGE_VOICE;
  return edgeVoices[agentId] ?? DEFAULT_EDGE_VOICE;
}

/** Guards the synthesis route against a voice id arriving from the wire. */
export function isKnownVoice(agentId: string | undefined): boolean {
  return Boolean(agentId && (agentId === "student" || agentId in edgeVoices));
}

// ---- Browser Web Speech fallback -----------------------------------------

export type VoiceGender = "female" | "male";

export interface VoiceProfile {
  gender: VoiceGender;
  /** 0–2, where 1 is the voice's natural pitch. */
  pitch: number;
  /** 0.1–10, where 1 is the voice's natural speed. */
  rate: number;
}

/**
 * `pitch` and `rate` are the part that survives everywhere. Even where two
 * agents end up sharing an underlying OS voice, the offsets keep them
 * distinguishable by ear.
 */
export const voiceProfiles: Record<string, VoiceProfile> = {
  citizen:   { gender: "female", pitch: 1.08, rate: 0.98 },
  technical: { gender: "male",   pitch: 1.05, rate: 1.1 },
  financial: { gender: "male",   pitch: 0.85, rate: 0.94 },
  legal:     { gender: "female", pitch: 0.95, rate: 0.92 },
  ip:        { gender: "female", pitch: 1.18, rate: 1.0 },
  industry:  { gender: "male",   pitch: 0.92, rate: 1.04 },
};

export const DEFAULT_VOICE_PROFILE: VoiceProfile = { gender: "female", pitch: 1, rate: 1 };
export const STUDENT_VOICE_PROFILE: VoiceProfile = { gender: "male", pitch: 1, rate: 1.05 };

export function voiceProfileFor(agentId: string): VoiceProfile {
  if (agentId === "student") return STUDENT_VOICE_PROFILE;
  return voiceProfiles[agentId] ?? DEFAULT_VOICE_PROFILE;
}

/**
 * Voice names that are reliably one gender, as a fallback for platforms that
 * don't expose gender on `SpeechSynthesisVoice` — which is all of them, since
 * the spec has no such field. Matched case-insensitively as substrings.
 */
const FEMALE_HINTS = [
  "female", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "serena",
  "allison", "ava", "susan", "zira", "hazel", "joanna", "salli", "kimberly",
  "amy", "emma", "neerja", "heera", "veena", "google uk english female",
  "google us english",
];

const MALE_HINTS = [
  "male", "daniel", "alex", "fred", "tom", "oliver", "rishi", "aaron", "david",
  "mark", "george", "matthew", "brian", "arthur", "ravi", "hemant", "prabhat",
  "google uk english male",
];

function scoreGender(voiceName: string, want: VoiceGender): number {
  const name = voiceName.toLowerCase();
  const wanted = want === "female" ? FEMALE_HINTS : MALE_HINTS;
  const other = want === "female" ? MALE_HINTS : FEMALE_HINTS;
  if (other.some((hint) => name.includes(hint))) return -1;
  if (wanted.some((hint) => name.includes(hint))) return 2;
  return 0;
}

/**
 * Voices that must never be handed to a council member.
 *
 * macOS ships ~15 novelty voices — "Bad News", "Boing", "Bubbles", "Zarvox" —
 * alongside the real ones, and the Web Speech API presents them identically.
 * Ranking by name then put "Albert", "Bad News" and "Bahh" at the front of the
 * English pool on a stock Mac, so the Financial Strategist delivered a budget
 * warning as a cartoon sound effect. The older robotic voices (Fred, Ralph,
 * Junior, Kathy, Agnes) are excluded for the same reason: they undercut the
 * feature rather than degrading it.
 *
 * A denylist rather than an allowlist, because the voice list on Windows,
 * Android and Linux shares almost nothing with this one and an allowlist would
 * leave those platforms with no voices at all.
 */
const NOVELTY_VOICES = [
  "bad news", "bahh", "bells", "boing", "bubbles", "cellos", "good news",
  "jester", "organ", "superstar", "trinoids", "whisper", "wobble", "zarvox",
  "albert", "junior", "kathy", "ralph", "fred", "agnes", "princess",
  "deranged", "hysterical", "bruce", "bahh",
];

function isNovelty(voiceName: string): boolean {
  const name = voiceName.toLowerCase();
  return NOVELTY_VOICES.some((hint) => name.includes(hint));
}

/**
 * Picks a concrete voice for `profile` out of `available`, preferring voices
 * not already handed to another speaker in `taken` so the council doesn't
 * sound like one person doing every part.
 *
 * Priority is gender first, uniqueness second — and that order matters. On a
 * machine offering only two female voices someone has to double up, and
 * ranking uniqueness first would hand the third woman an unused *male* voice,
 * which is far more jarring than two women sharing a voice at different
 * pitches. Every profile carries a distinct pitch/rate pair precisely so that
 * sharing stays survivable.
 */
export function pickVoice(
  available: SpeechSynthesisVoice[],
  profile: VoiceProfile,
  taken: ReadonlySet<string>,
): SpeechSynthesisVoice | null {
  if (available.length === 0) return null;

  // Prefer English voices — the transcript is English, and a non-English voice
  // reading it produces the wrong phonemes rather than an accent. Indian
  // English wins outright only when the machine has enough of them to give the
  // panel distinct voices; a single `en-IN` voice shared by six people is
  // worse than six varied English ones.
  const indian = available.filter((voice) => voice.lang.toLowerCase().startsWith("en-in"));
  const english = available.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const byLanguage = indian.length >= 2 ? indian : english.length > 0 ? english : available;

  // Falls back to the unfiltered list rather than returning nothing: on a
  // machine offering only novelty voices, a silly voice beats silence.
  const serious = byLanguage.filter((voice) => !isNovelty(voice.name));
  const pool = serious.length > 0 ? serious : byLanguage;

  const byQuality = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice) => {
    // `localService` voices work offline and have no per-utterance network
    // latency, which matters when a turn should start speaking immediately.
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    return a.name.localeCompare(b.name);
  };

  // Anything not positively identified as the opposite gender is fair game;
  // most voice names carry no hint either way, and reading them as neutral is
  // better than discarding them.
  const sameGender = pool
    .filter((voice) => scoreGender(voice.name, profile.gender) >= 0)
    .sort((a, b) => {
      const delta = scoreGender(b.name, profile.gender) - scoreGender(a.name, profile.gender);
      return delta !== 0 ? delta : byQuality(a, b);
    });

  const unusedSameGender = sameGender.find((voice) => !taken.has(voice.voiceURI));
  if (unusedSameGender) return unusedSameGender;
  const reusableSameGender = sameGender[0];
  if (reusableSameGender) return reusableSameGender;

  const ranked = [...pool].sort(byQuality);
  return ranked.find((voice) => !taken.has(voice.voiceURI)) ?? ranked[0] ?? null;
}
