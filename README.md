# JanMaang

A civic demand-to-budget platform. A citizen reports a local need in their own
voice; AI structures it; identical reports are clustered so forty people asking
for the same handpump count as one demand with the weight of forty; the demand
is ranked against every other demand in the district on five published factors;
government funds down the ranked list; and the citizens who reported it decide
whether it was actually fixed.

**Speak → Analyze → Cluster → Prioritise → Fund → Execute → Citizen Verify**

## The map

Issues are plotted at their coordinates and **aggregated by location**: forty
citizens reporting the same handpump become one pin carrying the weight of
forty. Concentration is ranked across four tiers — green, amber, orange, red —
taken directly from the five colour bars under the logo wordmark, so the map
legend and the brand mark are the same palette.

Colour is never the only signal. Pin diameter (34 → 64px), ring weight and the
count badge all move with the tier, so the ranking survives greyscale and
colour-blindness. Only the critical tier pulses; animating every marker would
make the map unreadable. Nearby sites cluster while zoomed out and resolve into
individual pins past zoom 14, with cluster weight measured in total reports
rather than number of sites.

## The assistant

One conversational surface does two jobs: it answers questions about the
platform and civic reporting, and it walks a citizen through filing a report —
description, category, urgency, location — before showing a summary card. The
report is written only when the citizen presses Confirm; the model can say a
draft looks complete, but the server refuses anything that does not carry an
explicit confirmation, and it re-derives the missing fields itself rather than
believing the reply.

**The conversation is never stored.** It lives in Riverpod state and nowhere
else — no collection, no `shared_preferences`, no logs. A reload clears it. A
confirmed report is the one thing that outlives the chat, and it goes through
the existing report submission flow, so it is indistinguishable from one filed
on the Report screen.

Voice input uses the same speech recogniser the report flow uses, and drops its
words into the text field for the citizen to check rather than sending them.
Spoken replies use the browser voice by default; ElevenLabs is optional and
falls back to that voice on any failure, including a spent free quota.

The Gemini key lives in `server/` — four HTTP endpoints deployed to Vercel's
free tier rather than to Cloud Functions, which need a billing plan this
project does not have. With no deployment configured the assistant runs against
the in-memory implementation, so a fresh clone works with no keys and no
account. See [CHATBOT_SETUP.md](CHATBOT_SETUP.md).

## Data transparency

`docs/SOURCES.md` is the source of truth for provenance, and the app renders it
at `/method`: every dataset, its licence, what it feeds, what was rejected and
why, and the two landmines that shaped the product.

Every seeded record is labelled. A provenance line — *"Synthetic rural ·
Approximate location"* — sits beside the figures it explains, and tapping it
opens the dataset, its licence and the "realistic, not real" caveat.

**No SLA or time-to-resolution metric appears anywhere.** The BBMP grievance
schema carries a grievance date and a status string but no closure timestamp,
so that number is not computable and would have to be invented. Supported
metrics — reports by category, ward, quarter, status and volume — are used
instead.

## Design provenance

Every screen is built from the Stitch project *JanMaang Civic Intelligence
System* (`projects/5610348960166970948`). The colour roles, type scale, spacing,
radii and elevation recipe in `lib/core/theme/` are transcribed from that
design system rather than approximated — see
[docs/STITCH_INVENTORY.md](docs/STITCH_INVENTORY.md) for the screen-by-screen
mapping and the full token table.

## Stack

Flutter · Dart · Material 3 · Riverpod 3 · go_router · flutter_map +
OpenStreetMap · Firebase (Auth, Firestore, Storage, Functions, Messaging,
Analytics, Crashlytics) · Google Sign-In · Gemini (server-side only)

The brief asked for Framer Motion and Leaflet. Both are React libraries and
cannot run in Flutter, so their roles are filled by the platform equivalents:
**flutter_map** renders the same OpenStreetMap tiles under the same ODbL
attribution, and the motion system in `lib/core/theme/motion.dart` provides the
page transitions, staggered entrances, counters and press feedback. Every
animation honours the platform reduce-motion setting.

## Running it

The app runs out of the box against in-memory repositories seeded with the same
figures the designs were reviewed with, so no Firebase project is needed to see
or test the whole UI:

```bash
flutter run
```

For demos and screenshots, skip the OTP step:

```bash
flutter run --dart-define=DEMO_SIGNED_IN=true
```

Against live Firebase:

```bash
flutterfire configure --project=<your-project-id>
# then follow the TODO in lib/bootstrap.dart
flutter run --dart-define=USE_MOCKS=false
```

Google Maps surfaces stay as styled placeholders until a platform key is
provisioned; enable them with `--dart-define=MAPS_ENABLED=true`.

## Architecture

```
lib/
  core/        config · constants · theme · routing · services · errors · utils
  features/    onboarding auth home report demands ledger verification profile
                 assistant, each with data/ domain/ presentation/
  shared/      models · widgets (the design-system component library)
server/        the assistant API — Gemini, ElevenLabs and the ConvAI webhook
```

Presentation never imports `cloud_firestore`. Repositories are interfaces in
`domain/`, implemented twice in `data/` — against Firebase and in memory — and
selected at the composition root in `lib/core/providers.dart`. Swapping one out
is a one-line override, which is also how the tests inject fakes.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data model, the
Firestore collections and the Cloud Function boundaries.

## Brand and photography

Two asset slots, both with graceful fallbacks so the build never breaks on a
missing file:

- `assets/brand/` — the logo lockup and square mark. `JmLogo` falls back to a
  typographic lockup. Launcher icons, favicon and splash are generated from the
  mark via `flutter_launcher_icons.yaml` and `flutter_native_splash.yaml`.
- `assets/gallery/` — the four infrastructure photographs behind the
  auto-scrolling gallery on Home (`roads.jpg`, `transit.jpg`, `civic.jpg`,
  `water.jpg`). Until they land, each slide renders a designed gradient card
  with its icon and caption.

See the README in each directory for sizes and export settings.

## Security

No server-side credential ships in the app. The Gemini key lives in Secret
Manager and is reachable only through the `analyzeReport` callable; ranking,
clustering, funding and verification are all server-write-only, enforced by
`firebase/firestore.rules`. See [SECURITY.md](SECURITY.md).

## Checks

```bash
flutter analyze
flutter test
```

## Platform status

| Target | State |
|---|---|
| Android | builds; toolchain configured against SDK 36.1.0 + JDK 17 |
| Web | builds and runs; used for UI verification in this environment |
| iOS | needs a full Xcode install (only Command Line Tools present) plus CocoaPods |
