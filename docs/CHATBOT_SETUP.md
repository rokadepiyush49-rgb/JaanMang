# JanMaang Assistant — setup

One assistant, two jobs: it answers questions about the platform and civic
reporting, and it guides a citizen through filing a report. Both happen in the
same conversation.

It runs with **no configuration at all**. Against the in-memory repositories —
the default — the whole flow works, including the confirmation gate and a real
demand landing in "My Demands". Gemini, ElevenLabs and ConvAI are each a step
up from that baseline, and each degrades back to it when switched off, unpaid
for, or unreachable.

```bash
flutter run --dart-define=DEMO_SIGNED_IN=true
```

The assistant is the bubble above the navigation bar, on every tab.

---

## What is where

| Piece | Path |
|---|---|
| Chat panel, launcher, bubbles, summary card | `lib/features/assistant/presentation/` |
| Ephemeral conversation state | `lib/features/assistant/presentation/assistant_controller.dart` |
| Offline assistant (runs against the fixtures) | `lib/features/assistant/data/assistant_repository_mock.dart` |
| Client knowledge base | `lib/features/assistant/data/assistant_knowledge_base.dart` |
| Browser speech output | `lib/core/services/speech_output_*.dart` |
| HTTP transport to the API | `lib/features/assistant/data/assistant_repository_http.dart` |
| Gemini chat | `server/api/chat.ts` |
| Confirmation-gated submission | `server/api/submit-report.ts` |
| Shared validation and submission | `server/lib/` |
| ElevenLabs speech | `server/api/speak.ts` |
| ConvAI webhook | `server/api/convai.ts` |

---

## Conversation privacy

The transcript lives in one place: `AssistantState`, in memory, in the client.

- No Firestore collection, no `shared_preferences`, no cookie, no cache.
- The recent turns are sent with each request and dropped when the function
  returns; the backend keeps no session and there is nothing to clean up.
- Message text is never logged. The failure paths log an error class, not a
  conversation.
- Reloading the page clears the chat. Closing and reopening the panel within a
  session does not — the state outlives the sheet but not the process.

A **confirmed report** is different, and deliberately so: it becomes a public
demand through the app's existing submission flow, with the same code, status
and timeline as one filed on the Report screen. Only the conversation around it
is ephemeral.

---

## Gemini

The backend is a handful of HTTP endpoints on **Vercel**, not Firebase Cloud
Functions — Functions require the Blaze plan, and this project is on Spark. The
free Hobby tier needs no card.

```bash
cd server
npm install
cp .env.example .env          # set GEMINI_API_KEY
npx vercel deploy --prod      # first run links the project and asks for a login
```

Then point the app at it:

```bash
flutter run --dart-define=ASSISTANT_API_BASE_URL=https://<your-deployment>.vercel.app
```

Without that define the app uses the in-memory assistant, so a fresh clone runs
with no keys, no account and no network.

**On duration.** One request is one conversational turn — a few seconds. A
ten-minute conversation is twenty short requests, not one long one, and
speech-to-text never reaches the server at all (it runs on the device). Vercel
Hobby allows 300s per invocation with Fluid Compute, so there is roughly sixty
times more headroom than the slowest call needs. `vercel.json` pins
`maxDuration` to 60s, which is already generous; raise it only if you add
something genuinely slow.

`/api/chat` returns a structured reply, validated with Zod before anything
reaches the client:

```ts
{ intent, assistantMessage, reportDraft, missingFields, readyToConfirm }
```

`intent` is one of `QUESTION | REPORT | CLARIFY | CONFIRM_REPORT`.

Three things are worth knowing about how far the model is trusted:

1. **`missingFields` and `readyToConfirm` are recomputed on the server** from
   the merged draft. The model's own opinion is discarded. A confident reply
   cannot talk the intake past a field it does not have.
2. **The model never submits.** `/api/chat` has no write path.
   `/api/submit-report` does, and it refuses any request without
   `confirmed: true` — which the client sets from the Confirm button on the
   summary card and nowhere else.
3. **Invalid output is absorbed.** Malformed JSON, a schema violation, a quota
   error or a network fault all produce a plain fallback reply that keeps the
   conversation usable and never claims a draft is ready.

> **If every reply is the fallback**, the model id is the first thing to check.
> Google retires ids on its own schedule and answers a retired one with a 404,
> which lands in exactly the same catch as a network fault. The log line names
> the model it tried and quotes Google's message, which usually names the
> replacement — set `GEMINI_MODEL` to it. That is a dashboard change, not a
> redeploy.
>
> ```bash
> npx vercel logs <your-deployment>.vercel.app --json
> ```

### What the assistant is allowed to say

`server/lib/knowledgeBase.ts` holds every fact the model
may state, and — just as importantly — a `CANNOT_ANSWER` list of things the
platform genuinely cannot tell a citizen. Add a topic by adding an entry; there
is no retrieval layer to rebuild.

The refusals are not generic caution. The BBMP grievance schema carries no
closure timestamp, so a time-to-resolution figure is not computable; the
assistant says so rather than inventing one. This mirrors the rule the rest of
the app follows (see `docs/SOURCES.md`).

`lib/features/assistant/data/assistant_knowledge_base.dart` is the client-side
mirror that backs the offline build. Extend both.

---

## Voice input and output

**Input** uses the existing `SpeechService` (`speech_to_text`), which is the
Web Speech API on web and the platform recogniser on mobile. Where it is
unavailable the microphone control disappears and a line explains why.

Recognised words go **into the text field**, not into the conversation. Nothing
is sent automatically — a misheard civic report is a wrong public record, so the
citizen reads it back and edits it first. That friction is intentional.

A photo is optional evidence. The attach control appears in the composer only
once a report is under way, caps at four images like the report screen, and
never blocks the intake — a report with no photo is filed the same way.

**Output** has two routes, tried in order:

1. ElevenLabs audio from `/api/speak`, if configured.
2. The browser's own `speechSynthesis` voice.

Route 2 is the default and the fallback. Route 1 never becomes a dependency:
every failure — flag off, key absent, quota exhausted, service down — returns
`unavailable`, and the client speaks with the device voice instead.

> Browser speech output is a browser feature. On Android, iOS and desktop
> builds `SpeechOutput.isSupported` is false and the speaker control is hidden
> rather than shown as a dead button. Text chat and voice *input* work
> everywhere. Adding native TTS later means implementing `SpeechOutput` against
> a platform plugin — no caller changes.

### Enabling ElevenLabs speech (optional)

Set these in the Vercel dashboard (Project → Settings → Environment
Variables), or in `server/.env` for local `vercel dev`:

| Variable | Default | Meaning |
|---|---|---|
| `ENABLE_ELEVENLABS_TTS` | `false` | Master switch |
| `ELEVENLABS_API_KEY` | — | Required only when the flag is on |
| `ELEVENLABS_VOICE_ID` | Rachel | Voice to speak with |
| `ELEVENLABS_MODEL_ID` | `eleven_flash_v2_5` | Model |

**Free-tier behaviour.** The free plan is 10,000 credits a month. Flash costs
half a credit per character, so that is roughly 20,000 characters — about
eighty spoken replies in total, across every user. It is a demo allowance, not
a production one, and the defaults are sized for it: `/api/speak` caps a reply
at 400 characters and allows 5 requests per minute per IP, separately from the
chat endpoint.

When the allowance runs out ElevenLabs answers 429; the endpoint logs the
status, returns 503, and the assistant speaks with the device voice. Nothing
breaks and the citizen sees no error — which is correct in production and
unhelpful during setup, so the log line also records the voice id, the model id
and ElevenLabs' own message. That is enough to tell a bad key (401) from a bad
voice id (422) from a spent quota (429) in one look:

```bash
npx vercel logs <your-deployment>.vercel.app --json
```

Setting `ENABLE_ELEVENLABS_TTS=false` skips the call entirely.

---

## ConvAI real-time voice (optional demo)

A live voice agent hosted by ElevenLabs, gated behind two compile-time flags.
With either missing — the default — it renders nothing, and the text assistant,
its voice input and its spoken replies are unchanged.

```bash
flutter run \
  --dart-define=ENABLE_ELEVEN_CONVAI=true \
  --dart-define=ELEVEN_AGENT_ID=agent_xxxxxxxxxxxx
```

The agent id is never hardcoded, so a fork does not inherit somebody else's
agent and spend their minutes. The widget script is fetched on demand when the
panel opens rather than from `web/index.html`, so the default build does not
load a third-party bundle for the majority of citizens who will never see it.
The embed is browser-only; other platforms say so and carry on.

### The webhook

`/api/convai` is the endpoint the agent calls. It is the least trusted surface
in the app, and it is treated accordingly:

- a shared secret header proves the request came from the configured agent;
- a **Firebase ID token**, forwarded by the agent as a *secret* dynamic
  variable, proves which citizen is speaking. The uid comes from the verified
  token, never from the body — an agent cannot file in someone else's name.
  Send it as `Authorization: Bearer {{secret__firebase_token}}`; the
  `x-janmaang-id-token` header and an `idToken` body field are also accepted;
- the body goes through the same Zod schemas and the same
  `submitConfirmedDraft` as the text chatbot, so voice cannot file anything
  typing could not;
- until `CONVAI_WEBHOOK_SECRET` is set, the endpoint answers 404 to everything.

Set `CONVAI_WEBHOOK_SECRET` and `FIREBASE_PROJECT_ID` in the Vercel dashboard,
then redeploy.

**No service-account key is involved.** ID tokens are verified against Google's
public keys with `jose`, and the demand is written through the Firestore REST
API carrying the *citizen's own* token — so `firestore.rules` governs this
server exactly as it governs the app, and a compromised deployment holds no
admin rights over your Firebase project.

Two actions:

| Action | Effect |
|---|---|
| `create_report_draft` | Merges details into a draft and returns `missingFields`. Writes nothing. |
| `submit_report` | Files the report. Requires `confirmed: true`. |

Request:

```jsonc
POST https://<your-deployment>.vercel.app/api/convai
x-janmaang-webhook-secret: <CONVAI_WEBHOOK_SECRET>
Authorization: Bearer {{secret__firebase_token}}

{
  "action": "create_report_draft",
  "draft":   { "description": "...", "category": "water" },
  "updates": { "locationLabel": "Ward 4", "severity": "high" }
}
```

Response:

```json
{
  "draft": { "description": "...", "category": "water",
             "locationLabel": "Ward 4", "severity": "high" },
  "missingFields": [],
  "readyToConfirm": true
}
```

Then, once the agent has read the summary back and heard a yes:

```jsonc
{ "action": "submit_report", "draft": { ... }, "confirmed": true }
```

```json
{ "demandId": "...", "code": "YDG-WTR-0417", "title": "Drinking Water", "status": "reported" }
```

### Configuring the agent (manual, in the ElevenLabs dashboard)

**Nothing in this repository can configure the remote agent.** The code here
provides the endpoint; wiring an agent to it is done by hand, once:

1. Create an agent at <https://elevenlabs.io/app/conversational-ai> and copy its
   agent id into `--dart-define=ELEVEN_AGENT_ID`.
2. Add a **webhook tool** per action (`create_report_draft`, `submit_report`),
   both pointing at `https://<your-deployment>.vercel.app/api/convai` with
   method POST.
3. Add the header `x-janmaang-webhook-secret` with the value you set as
   `CONVAI_WEBHOOK_SECRET`. Store it as a secret in the dashboard, not inline.
4. Declare `secret__firebase_token` as a **secret dynamic variable**. The
   `secret__` prefix is not cosmetic: ElevenLabs permits such values in tool
   headers but never sends them to the LLM, which is what an auth token needs.
   Give both tools the header
   `Authorization: Bearer {{secret__firebase_token}}`.

   The client supplies it. `ConvaiEmbed(idToken: ...)` sets it on the
   `<elevenlabs-convai>` element as `dynamic-variables`. Pass a **freshly
   refreshed** token: Firebase ID tokens last an hour, the webhook verifies
   them, and an expired one is a 401 in the middle of a conversation.
5. In the agent's system prompt, require it to read the full report back and
   get an explicit yes before calling `submit_report` with `confirmed: true`.

Step 5 is a prompt instruction, and prompt instructions are not a security
control — which is why the server checks `confirmed` itself and validates every
field regardless of what the agent claims.

---

## Configuration summary

Client, via `--dart-define` (see `.env.example`) — no secrets:

| Name | Default | Meaning |
|---|---|---|
| `USE_MOCKS` | `true` | In-memory fixtures instead of live Firebase |
| `DEMO_SIGNED_IN` | `false` | Skip OTP in the mock build |
| `ENABLE_ELEVEN_CONVAI` | `false` | Show the ConvAI demo |
| `ELEVEN_AGENT_ID` | empty | ConvAI agent id |
| `ASSISTANT_API_BASE_URL` | empty | The deployment URL. Empty = in-memory assistant |

Server, in the Vercel dashboard or `server/.env` (see `server/.env.example`):

| Name | Required | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | yes | The only one the assistant genuinely needs |
| `GEMINI_MODEL` | no | Overrides the model id. Defaults to `gemini-3.6-flash` |
| `FIREBASE_PROJECT_ID` | for filing | Not a secret; verifies tokens, addresses Firestore |
| `REQUIRE_AUTH` | no | `false` while the app has no real Firebase Auth |
| `ALLOWED_ORIGINS` | recommended | CORS allowlist |
| `RATE_LIMIT_PER_MINUTE` | no | Defaults to 20 per IP |
| `ENABLE_ELEVENLABS_TTS` | no | Master switch for ElevenLabs |
| `ELEVENLABS_API_KEY` | if enabled | |
| `SPEAK_RATE_LIMIT_PER_MINUTE` | no | `/api/speak` only. Defaults to 5, sized for the free tier |
| `CONVAI_WEBHOOK_SECRET` | for ConvAI | Unset = `/api/convai` returns 404 |

> **Until `REQUIRE_AUTH` is on, `/api/chat` is open to anyone who finds the
> URL**, and it spends your Gemini quota. The rate limit and CORS allowlist are
> a brake, not a lock — the limit is per-instance and resets on cold starts.
> Set `ALLOWED_ORIGINS`, and turn on auth as soon as Firebase Auth is wired.

---

## Tests

```bash
flutter test test/unit/assistant_draft_test.dart \
             test/unit/assistant_repository_test.dart \
             test/unit/assistant_repository_http_test.dart \
             test/unit/assistant_controller_test.dart \
             test/widget/assistant_panel_test.dart

cd server && npm run typecheck && npm run smoke
```

`npm run smoke` invokes every endpoint in-process with no keys and no network
account. It exists because `tsc` proves the code compiles, not that the modules
load — and because the property worth guarding hardest is that an unreachable
model still returns a usable reply that never claims a report is ready.

They cover reply validation and enum clamping, draft state transitions across
turns, the confirmation gate from both sides (an unconfirmed complete draft and
a confirmed incomplete one), the device-voice fallback, error and retry, and
that a fresh container starts empty — the check that would fail first if the
transcript were ever persisted. The HTTP suite covers request shape, bearer
headers, status-to-failure mapping and every ElevenLabs fallback path.
