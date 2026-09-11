# Jan Setu — Design

Jharkhand's societal innovation OS. A citizen reports a local need in their own
voice; AI structures it; identical reports cluster so forty people asking for
the same handpump count as one demand carrying the weight of forty; the demand
is ranked against every other demand in the district on published factors;
government or industry funds down the ranked list; a student team builds it;
and the citizens who reported it decide whether it was actually fixed.

**Speak → Analyze → Cluster → Prioritise → Fund → Build → Citizen Verify**

This document records the design of the system: who the surfaces serve, how
they are laid out, the visual language they share, the engines behind the
numbers they show, and the rules that decide what crosses between them. For
*where new code goes*, see [docs/structure.md](docs/structure.md); for the
citizen app's internals, [ARCHITECTURE.md](apps/citizen-app/docs/ARCHITECTURE.md)
and its screen-by-screen Stitch mapping in
[STITCH_INVENTORY.md](apps/citizen-app/docs/STITCH_INVENTORY.md); for secrets,
[SECURITY.md](SECURITY.md).

---

## 1. Surfaces

Five audiences, one product. Each surface is designed around what its user is
accountable for, not around a shared feature list.

| Surface | Who | Where | Built on |
| --- | --- | --- | --- |
| **Citizen app** | Residents reporting and verifying | `apps/citizen-app/` | Flutter · Material 3 · Riverpod · go_router · flutter_map |
| **Student web** | Students, teams, campuses | `apps/web/src/app/(app)/`, `/collaborate` | Next.js App Router · React 19 · Tailwind v4 |
| **Government workspace** | Officers, from panchayat secretary to DC | `apps/web/src/app/gov/` | same |
| **Industry portal** | CSR teams, funders, corporate mentors | `apps/web/src/app/industry/` | same |
| **Institute portal** | Registrars and faculty guides at universities, colleges, polytechnics, ITIs and training institutes | `apps/web/src/app/institute/` | same |

The four web surfaces are one Next.js application (`apps/web`) sharing one
token file, one component library and one icon set. They are separated by route
group and by their own shell, not by deployment.

The institute portal is the only surface with two roles inside it.
`institute_admin` is the registrar — they verify the student roster, add
faculty and edit the institution. `faculty` is a guide — the same
`institute.team.manage` permission, but scoped by the server to the teams they
actually guide. The distinction is enforced in `InstituteService`, not by which
buttons the client renders.

The citizen app is a separate binary because its job is different: offline
tolerance, voice input, a map, and a person standing in front of a broken
handpump. It shares the design language rather than the code — the web token
file in `apps/web/src/app/globals.css` is transcribed value for value from
`apps/citizen-app/lib/core/theme/`, with the app's file names quoted beside
each block. **When a token changes there it must change here.**

`packages/` and `backend/` are placeholders with a fixed place in the
architecture and no code in them yet. Nothing is duplicated into them.

---

## 2. Information architecture

### Student web — `(app)` route group

A left sidebar of destinations on desktop, a floating five-item bar on mobile.

```
/dashboard          Today: progress, pulse, deadlines, recommended work
/profile            Identity, skills, impact score, rank, streak
/opportunities      Open calls, filtered
/projects           What this student is building
/applications       What they have applied to, and where each stands
/problem-explorer   Validated citizen problems, browsable as challenges
/achievements       Badges, contributions, leaderboard position
/notifications      One feed
/settings           Account, language, preferences
/impact-hub         Aggregate outcomes across the platform
/industry-hub       Partners, sponsorships, mentors

/council            AI Project Council — landing
/council/new        Seat the panel, write the brief
/council/session    The debate, live
/council/verdict    Scored readiness and refinements

/collaborate/new    Wizard: start a collaboration
/collaborate/team   Assemble a team
/collaborate/review Review and submit
```

`/collaborate` is deliberately outside the `(app)` shell: it is a focused
wizard with its own slim header and a back arrow, because a person mid-flow
should not be looking at eleven other destinations.

### Government workspace — `/gov`

Grouped by what an officer is answerable for, in the order the work happens:

- **Triage** — Overview · Problems · Priority Queue · Map
- **Delivery** — Departments · Officers · Projects
- **Money** — Industry Sponsorship · Government Funding
- **Proof** — Citizen Feedback · Impact Analytics
- Automation Center · Notifications · Settings

### Industry portal — `/industry`

- **Find** — Home · Discover Challenges · Impact Opportunities
- **Commit** — My Projects · Funding · Mentorship
- **Work with** — Universities · Messages
- **Account for** — Impact · CSR Ledger
- Automation · Notifications · Company Profile · Settings

Each of the three shells carries badge counts on the destinations that hold
work — pending validations, SLA breaches, milestones awaiting review — so the
navigation itself is a queue.

---

## 3. The visual model

One idea, held everywhere:

> **The page is periwinkle. Cards are pure white and float on it. Ink is
> near-black indigo. Depth comes from a tinted value gap and one very soft
> navy-tinted shadow — never from borders and never from grey drop shadows.**

A white card on a `#dae3fb` page separates itself by value alone, so it needs
no hairline. This is why `Card` has no border, why radii are generous (28px on
the standard surface), and why every shadow in the system is tinted with the
brand ink at low alpha rather than with black.

### Colour

Tokens live in `apps/web/src/app/globals.css` under `@theme`, consumed as
Tailwind utilities (`bg-card`, `text-ink-muted`, `shadow-level1`).

**Brand**

| Token | Value | Role |
| --- | --- | --- |
| `--color-ink-brand` | `#191a2e` | The ink everything presses |
| `--color-periwinkle` | `#6b85f0` | Primary brand hue, focus ring |
| `--color-orchid` | `#c77bee` | |
| `--color-amber` | `#e5b54e` | |
| `--color-clay` | `#e29448` | |
| `--color-mint` | `#2fae6a` | |

These same five colour bars sit under the logo wordmark and are the map's
four-tier concentration legend — the brand mark and the legend are one palette.

**Surfaces** — `surface #dae3fb` (the page) · `surface-dim #c6d2f3` ·
`card #ffffff` · `card-muted #f4f6fd` · `container #e6ebfa` ·
`container-high #dce3fb` · `track #cbd6f6` · `line #e2e6f4`.

**Ink** — `ink #1b1d2e` · `ink-muted #5a6076` · `ink-faint #5f6478`.

**Six tile tints** (`Tint` in `ui.tsx`) — navy, orchid, amber, blue, clay,
mint. Each is a pale wash paired with a foreground dark enough to clear 4.5:1
*on the wash*, so a tint is never a saturated fill with white text.

**Six semantic tones** (`Tone`) — neutral, info, success, warning, critical,
gold. Every status in the product resolves to one of these six. Badges use
tint-behind-dark-text at every size.

Legacy names (`impact`, `community`, `danger`) are aliased to mint, clay and
critical so several hundred pre-redesign class names inherited the new identity
without being rewritten. Deep variants are pulled one step darker than the
saturated hue so small text clears 4.5:1 on the periwinkle page, which is the
tightest surface in the system.

### Type

Two variable faces, self-hosted from the citizen app's own font files so the
wordmark on a phone and on a laptop are cut from the same metal.

- **DM Sans** — display and headline levels, for brand character.
- **Inter** — titles, body, labels, and every number.

| Utility | Size / leading | Weight |
| --- | --- | --- |
| `display-xl` | 48 / 56 | 700, −0.02em |
| `headline-xl` | 32 / 40 | 700, −0.02em |
| `headline-lg` | 24 / 32 | 600, −0.01em |
| `headline-md` | 20 / 28 | 600 |
| `label-caps` | 12 / 16, +0.05em, uppercase | 600 |
| `mono-data` | 14 / 20, tabular | 500 |
| `stat-number` | 30 / 38, tabular | 700 |

The ramp is the citizen app's, level for level, with one extra step on top:
a 1440px page carries a 48px display, a 390px one cannot.

`font-variant-numeric: tabular-nums` is applied to `th`, `td` and `.tabular-nums`
in base, so figures align down a column wherever they are stacked.

### Shape and elevation

Radii: `sm 10 · md 16 · lg 28 · xl 34 · pill`. The radius is what makes a white
rectangle read as an object rather than a panel.

Three elevations, all wide, faint and ink-tinted:

```
level1  0 8px 24px -10px rgb(25 26 46 / .06), 0 2px 6px -2px rgb(25 26 46 / .04)
level2  0 12px 28px -10px rgb(25 26 46 / .12)
level3  0 14px 40px -12px rgb(25 26 46 / .14), 0 2px 8px -2px rgb(25 26 46 / .06)
glow    0 0 0 3px rgb(107 133 240 / .18)
```

Resting card is level 1. A card that is a link lifts to level 2 on hover. A
drawer or modal sits at level 3.

### Motion

`--ease-jm: cubic-bezier(.215,.61,.355,1)` · fast 140ms · medium 260ms ·
slow 360ms.

`Enter` staggers children 60ms apart, capped at six so a long grid never leaves
its last card waiting half a second.

**The entrance animates transform only — never opacity.** On a phone an
animation always runs; on the web a backgrounded tab, a prerender or an
animation-suppressing extension can freeze a keyframe on its first frame. An
entrance starting at `opacity: 0` renders the page blank in that case. Animating
`translateY` alone makes the worst case a 12px offset instead of invisible
content.

`prefers-reduced-motion: reduce` collapses every animation and transition to
0.01ms globally.

### Iconography

One hand-drawn stroke set in `components/icon.tsx` — a `Record<IconName, JSX>`
of raw paths on a 24-unit grid, 1.7 stroke, rendered at 20px by default. No
icon dependency. `IconName` is a union, so a typo is a
build error and an icon can never silently fail to render.

Charts are the same decision: `components/gov/charts.tsx` and
`components/industry/graph.tsx` draw SVG by hand rather than importing a
charting library, which would arrive with its own type ramp, palette and idea
of a tooltip — three things this product has already decided.

---

## 4. Component system

`components/ui.tsx` (server-safe) and `components/ui-interactive.tsx`
(`"use client"`) are the shared vocabulary. Role-specific compositions live in
`components/gov/pieces.tsx` and `components/industry/pieces.tsx`.

**Surfaces** — `Card` (plain / flat / emphasised) · `CardLink` · `CardHeader` ·
`SectionHeader` · `PageHeading` (breadcrumb, split-weight title, subtitle,
actions).

**Actions** — `Button` · `ButtonLink` · `CircleButton`.

**Status** — `Badge` · `Tag` · `Progress` · `MetricBar`.

**Data display** — `StatTile` · `TintTile` · `ProgressCard` · `PillRow` ·
`Table` / `Row` / `Cell` · `Avatar` · `Medallion`.

**States** — `EmptyState` · `EmptyNote` · `Skeleton` · `SkeletonList`. Every
empty and error state is headed by a 68px tinted circle, so "nothing here yet"
looks designed rather than broken.

**Interactive** — `Segmented` · `Tabs` · `SearchField` · `Select` · `Menu` ·
`Modal` · `Disclosure` · `Toggle`.

**Layout** — `Enter` (staggered entrance) · `Stepper` (the collaborate wizard).

### Shell

```
┌─────────┬──────────────────────────────────┐
│ sidebar │ topbar (search · lang · avatar)  │
│  white  ├──────────────────────────────────┤
│  card,  │ main                             │
│ sticky  │   px-4 sm:px-6 lg:px-8           │
│         │   pt-6 lg:pt-8 · pb-28 lg:pb-10  │
└─────────┴──────────────────────────────────┘
                 ▲ floating bottom nav (<lg)
```

The sidebar is a 288px white card floating on the page with its own sticky
scroll — the same figure-and-ground as every other surface, not a chrome panel
welded to the edge.

A nav item is a pill that fills with ink when selected. Selection is marked
three ways — fill, weight and label colour — so it survives greyscale and a
bright screen. Mobile collapses it to a drawer at level 3 behind a scrim, plus
a five-destination floating bar with a raised centre "New" action.

`pb-28` on `main` is the app's `navClearance`: the floating bar must never rest
on the last element of a page.

---

## 5. Accessibility rules

These are constraints on the design, not a checklist applied afterwards.

- **Colour is never the only signal.** Every tinted surface carries its own
  icon and its own words. Map pins move diameter (34→64px), ring weight and a
  count badge with the tier, so the ranking survives greyscale and colour-vision
  deficiency.
- **Only the critical tier animates.** Animating every marker makes the map
  unreadable.
- **4.5:1 on the tightest surface.** Foregrounds are chosen against the
  periwinkle page, not against white.
- Focus is a 2px periwinkle outline at 2px offset, globally, never removed.
- Every chart is a `figure` with a text alternative, and its numbers appear as
  text beside or beneath it.
- Reduce-motion is honoured globally.
- Nav items carry `aria-current="page"`; the mobile drawer closes on Escape.
- The scrollbar is restyled so the tinted page never shows a white gutter under
  the cards.

---

## 6. Domain design

### The priority engine — "need ≠ votes"

`apps/web/src/lib/gov/priority.ts`

A ranking built on complaint counts rewards the villages that are loudest,
which are usually the ones already best served. So the count is one input among
seven, entering through `repeatedDemand` — deliberately the **smallest** default
weight in the model.

Seven factors: `populationImpact`, `severity`, `deprivation`, `coverage`,
`duration`, `recurrence`, `repeatedDemand`.

The engine is deterministic and explainable. Every score decomposes into
`factor × weight` contributions plus a short list of named, bounded
adjustments, and the UI renders that decomposition rather than a number from
nowhere. AI is used earlier in the pipeline — understanding a report,
classifying it, judging duplicates — and **never sets a rank**.

### The lifecycle

```
reported → ai_processed → validated → prioritised → sponsorship
    → funded → assigned → implementation → verification → impact
```

Statuses an officer acts on: `pending_validation`, `awaiting_sponsorship`,
`funding_required`, `in_progress`, `verification_pending`, `resolved`,
`rejected`. Severity is `critical | high | medium | low`.

### Jurisdiction scoping

`apps/web/src/lib/gov/rbac.ts`

An officer sees their own jurisdiction and everything beneath it — nothing
above and nothing beside it. A panchayat secretary sees Nagri; the BDO sees
every panchayat in Ranchi block; the DC sees the district. **The same
components render all three; only the scope changes.** Permissions are a closed
union (`problem.validate`, `problem.route`, `sponsorship.invite`,
`funding.approve`, `officer.assign`, …).

### The visibility boundary

`apps/web/src/lib/industry/visibility.ts`

The narrowest module in the codebase, and the only one permitted to turn a
government `Problem` into an industry `Challenge`. Everything an industry
screen renders about a citizen problem has passed through here, so a component
cannot leak a field it was never handed.

- A problem is invisible until validated. An unvalidated report is an
  allegation about a place and a person.
- Citizen identities never cross — not names, not numbers, not the verbatim
  text, not the coordinates. Volume and cluster do cross, because "43 reports
  over 3 days" is what makes the case.
- Officers are reduced to designations. Internal notes, routing overrides,
  rejection reasons and department budget positions do not cross at all.
- Students appear as a team, a first name, a year and a discipline — enough to
  hold a design review, not enough to approach someone off-platform.

### The match engine

`apps/web/src/lib/industry/match.ts`

A recommendation a partner cannot interrogate is one they will not act on. So
"92% match" is arithmetic: five weighted factors summing to 100 — `csrTheme`,
`geography`, `technical`, `fundingRange`, `deployment` — each scored against
something the company itself declared, each carrying the sentence that explains
its own score and the lever that would move it. Same shape as the priority
engine, for the same reason. The engine is pure and unit-testable.

### The moment the product is about

In `lib/industry/store.tsx`: committing funding to a challenge that has a
university team but no project **opens the project** — milestones, tranches,
audit trail and a mentorship offer. That is a state transition, not a
navigation.

---

## 7. The AI Project Council

Six named advisors debate a student's project, then return a scored verdict.
`apps/web/src/lib/council/` (~4,800 lines) and three route handlers.

| Seat | Person | Owns |
| --- | --- | --- |
| Citizen & Social Impact | Kavita Munda | acceptance, equity, ground truth |
| Technical Architect | Arjun Mehta | feasibility, privacy, scale |
| Financial Strategist | Rohan Desai | cost per beneficiary, who keeps paying |
| Legal & Compliance | Fatima Sheikh | permission, procurement, privacy |
| IP & Innovation | Dr. Neha Iyer | what is genuinely new |
| Industry Specialist | Vikram Rao | benchmarks, who would deploy it |

**Why they have human names.** A transcript where "Technical Architect" argues
with "Financial Strategist" reads as a spec, not a discussion, and personas
addressed by role slip into lecturing the student. Named people disagree with
named people, which is the behaviour the debate depends on.

**Why they disagree.** Six reasonable people reviewing a proposal converge. The
personas therefore carry *declared standing tensions* with each other. Topic
weights decide who **speaks**; personas decide what they **say**.

**Three phases** — diagnosis → challenge → refinement. Profiles set turns per
agent per phase: `standard` (1/1/1) is the real thing; `quick` (1/0/1) drops the
challenge round to fit a live demo slot, at the cost of the disagreement that
makes the council look like a council; `deep` is 1/2/1.

**One turn** = read the room (`topics.ts`) → score and pick a speaker
(`debate-policy.ts`) → assemble memory (`memory.ts`) → generate
(`client.ts` → `groq.ts`) → parse. Every step except generation is
deterministic, which is what keeps a session reproducible enough to debug.

Agents tag their own turns with a trailing `[risk] <label>` marker rather than
returning JSON — models write worse dialogue when it has to be a string field,
and the marker parses in one regex written loosely on purpose (the first real
session returned `[ risk]`).

**The verdict is one schema-constrained call, not six.** Six agents scoring
their own dimension costs six requests and produces scores nobody reconciled —
the technical seat rates feasibility 40 while the summary calls the project
ready. `readiness` is asked for rather than averaged, because a mean lets a
project with one fatal flaw and four strong scores read as 80% ready, which is
exactly the false comfort the feature exists to remove.

**State.** The server is stateless: the client owns the transcript and posts it
back each turn. `session-store.ts` carries a sitting across the three pages via
`sessionStorage` — not `localStorage`, because a council session is one sitting,
closing the tab should end it, and two tabs should be able to run two projects
without colliding. Every read is defensive: absent, stale or devtools-corrupted
state degrades to "no session" rather than throwing inside a render.

**Voice.** Two providers in preference order: Edge neural voices via
`/api/council/speech` (free, and the same voice id sounds identical on a laptop
and on a judge's screen), falling back to the browser's Web Speech API (robotic,
OS-dependent, but it cannot fail in a way that leaves the council silent). Once
Edge fails it is not retried for the session — retrying would add a 12-second
timeout to every turn.

**Models.** Groq's OpenAI-compatible endpoint called with `fetch`, no SDK.
Debate turns use the smaller `gpt-oss-20b` (the bulk of the calls and the
easiest work); the verdict uses `gpt-oss-120b` for strict JSON-schema output.
Groq meters per model, which also keeps debate traffic off the bucket the
verdict depends on. Keys are read through lazy getters, never captured at module
load, so a missing key fails the request that needed it rather than `next build`.

---

## 8. State and data architecture

There is no backend yet. Both operational surfaces run on a client store with a
reducer — `lib/gov/store.tsx` and `lib/industry/store.tsx` — and **the reducer
is deliberately shaped like a set of API mutations**. When `backend/api` lands,
each case becomes a request and the reducer keeps only the optimistic update.

Every workflow transition lives in the store rather than in a screen, so the
same action taken from a table row, a detail page or an alert produces exactly
the same state change and the same audit entry.

```
lib/gov/          types · mock-data · priority · rbac · filters
                  selectors · service · store · format · use-now
lib/industry/     types · mock-data · challenges · match · projects
                  visibility · selectors · service · store · format
lib/data.ts       student surface fixtures + navigation
```

Student screens read static fixtures from `lib/data.ts`; they have no store
because nothing on them mutates yet.

---

## 9. Localisation

`LOCALES = ["en", "hi"]` as a closed union, not an open string. The locale
selects a persona set, a keyword dictionary and a voice map on the server, each
a `Record<Locale, …>` that must stay exhaustive — adding a third language should
fail the build in every place that has not been translated, which `string` would
not do. Each language is named in itself (`English`, `हिंदी`), never translated.

`lib/i18n/strings.ts` is one flat object per locale, checked with `satisfies
Record<Locale, Strings>` so a missing translation is a type error. Interpolated
strings are **functions**, not templates with placeholders — a signature checks
that the caller passed `n`; a `"{n} advisors"` string does not.

Scope is honest: the council pages are bilingual, the rest of the app is
English. This is not a whole-app i18n layer and should not grow into one without
the same care being applied to the engine — translating the UI alone would
silently break speaker selection.

---

## 10. Data transparency

- Every seeded record is labelled. A provenance line — *"Synthetic rural ·
  Approximate location"* — sits beside the figures it explains, and opens the
  dataset, its licence and the "realistic, not real" caveat.
- [`apps/citizen-app/docs/SOURCES.md`](apps/citizen-app/docs/SOURCES.md) is the
  source of truth for provenance — every dataset, its licence, what it feeds,
  and what was rejected and why — and the citizen app renders it at `/method`.
- **No SLA or time-to-resolution metric appears anywhere.** The BBMP grievance
  schema carries a grievance date and a status string but no closure timestamp,
  so that number is not computable and would have to be invented. Reports by
  category, ward, quarter, status and volume are used instead.

---

## 11. Conventions

- `@/*` resolves to `apps/web/src/*`.
- Role-specific code goes in `src/features/<role>/`; shared UI in
  `src/components/`; shared logic in `src/lib/`. Code the citizen app also needs
  goes in `packages/`.
- `"use client"` only where interaction requires it. `ui.tsx` stays server-safe;
  anything stateful lives in `ui-interactive.tsx`.
- Server-only modules import `"server-only"` at the top —
  `env.ts`, `groq.ts`, `orchestrator.ts`, `verdict.ts`, `personas.ts`.
- `roster.ts` is client-safe and `personas.ts` is not, which keeps eight
  paragraphs of prompt text out of the browser bundle.
- Council agent `id` ties together the seat, every `speakerId` in the
  transcript, the voice and the persona. Treat ids as stable.
- Modules carry a header comment stating what they are for and, where a choice
  was contested, why it went the way it did. Keep that up.

---

## 12. Known gaps

Accurate as of the deployment described in `docs/DEPLOY.md`. Three of the five
entries below used to say something stronger; they are narrower now because the
work landed, and the ones that remain are the honest list.

- **Fifteen government mutations do not persist.** Sponsorship, funding, officer
  assignment, project progress, verification and automation toggles are reducer
  cases in `lib/gov/store.tsx` and are lost on reload. `validate`, `reject`,
  `route` and `weights/publish` are the four that reach the API. The backend
  modules behind the other eleven do not exist yet.
- **The industry portal and the student surface run on fixtures.**
  `lib/industry/service.ts` is `USING_MOCK_DATA = true`; the student screens
  render from `lib/data.ts`. Both surfaces carry a `DemoBanner` saying so — the
  banner is what makes shipping them honest, and it comes out when they are
  wired.
- **The citizen app is on a different backend.** `apps/citizen-app/` is built
  against Firebase and duplicates the ranking, clustering and verification this
  backend owns. It has never called a server.
- **`packages/` and `src/features/<role>/` are still empty.** Six role folders
  and five shared-layer folders, all `.gitkeep`. Either populate them from the
  OpenAPI contract or delete them and amend `docs/structure.md`; leaving them is
  a third option that has been taken for too long.
- **Nothing verifies the accessibility rules in §5.** No axe pass, no
  keyboard-navigation audit, no focus-trap check on the dialogs. The rules are
  written and followed by hand.

Authentication, session handling and persistence are no longer gaps. Every
surface is behind `proxy.ts` at the edge and `requireSurface()` in its layout;
the government and institute surfaces read and write real rows.
