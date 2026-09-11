# Jan Setu / JanMaang — Completion Plan

**Audit date:** 2026-09-11 · **Branch:** `feat/backend` · **Baseline verified by running:**
`backend` → `tsc --noEmit` ✅, `eslint` ✅, `vitest run` ✅ 33/33 ·
`apps/web` → `tsc --noEmit` ✅, `next build` ✅ 54 routes ·
`apps/citizen-app` → `flutter analyze` ✅ (1 info), `flutter test` ❌ **5 failing / 69**

This plan does not rewrite anything. The architecture (NestJS + Prisma + Postgres
backend, Next.js App Router web, Flutter citizen app) is sound and is kept. What
follows is the list of what is missing between here and production, ordered so
nothing is built twice.

---

## 0. Executive summary — where the project actually stands

| Surface | State | Honest assessment |
| --- | --- | --- |
| **Backend** | 29 endpoints live, green CI | Real, but serves ~8 of the 70 models in `schema.prisma`. Auth, RBAC, geography, gov reference data and the problem lifecycle work. Everything else is schema-only. |
| **Gov workspace** (`/gov`) | Partially wired | Login + problem list/detail/validate/reject/route + priority weights hit the real API. **15 other mutations are in-memory only** and reset on reload. Reference reads still use fixtures even though the endpoints exist. |
| **Industry portal** (`/industry`) | Mock | 18 screens, complete state machine, `USING_MOCK_DATA = true`. Zero backend. |
| **Student app** (`(app)`, `/collaborate`) | Fixtures | 13 screens rendered from a 982-line `lib/data.ts`. No auth, no backend. |
| **AI Project Council** | Working | Groq-backed, genuinely functional. Endpoints are **unauthenticated and unrate-limited**. |
| **Citizen mobile app** | Mock + wrong backend | Complete UI, 98 files, all repositories in-memory. Built against **Firebase**, which contradicts the NestJS backend. 5 broken tests. |
| **CI/CD** | Backend only | One workflow. No web CI, no Flutter CI, no deploy pipeline anywhere. |
| **Tests** | Backend only | 33 unit + 4 e2e specs backend. **Zero** in `apps/web`. Flutter suite is red. |

**The three decisions that gate everything else** (see §7 *What to do first*):
1. Firebase or the NestJS backend for the citizen app — they cannot both be the source of truth.
2. "JanMaang" or "Jan Setu" — the repo currently carries both product identities.
3. Whether the student + industry surfaces ship backed by the API, or ship explicitly labelled as demos.

---

## 1. Complete pending work list

Grouped by area. Each item: **what**, **where**, **why**, **what to do**, **depends on**, **priority**.

### 1.1 Repository hygiene & architecture

| # | Item |
| --- | --- |
| **A1** | **Orphaned Flutter project at repo root.** `pubspec.yaml`, `pubspec.lock`, `.metadata`, `analysis_options.yaml`, `flutter_launcher_icons.yaml`, `flutter_native_splash.yaml`, `.flutter-plugins-dependencies`, `CHATBOT_SETUP.md` sit at the root and are byte-identical to `apps/citizen-app/`, but there is no root `lib/` — the app was moved and the scaffolding was left behind. *Why:* `flutter` commands run from the root resolve the wrong project and `pub get` regenerates stale lockfiles. *Do:* delete the root copies (keep `CHATBOT_SETUP.md` only if it is moved under `docs/` and updated). *Deps:* none. **Priority: High** |
| **A2** | **`apps/citizen-app/_to_delete/` is tracked in git** — 1.4 MB of `.tgz` archives and stray PNGs. *Do:* `git rm -r`. *Deps:* none. **Priority: High** |
| **A3** | **`apps/web/package.json` is named `"tmp_next"`.** *Why:* it ends up in build metadata and lockfiles. *Do:* rename to `@jansetu/web`. **Priority: Medium** |
| **A4** | **Orphan root `package-lock.json`** — `{"packages": {}}`, no root `package.json`. *Do:* delete, or introduce a real npm workspace root (see A5). **Priority: Medium** |
| **A5** | **No monorepo tooling.** `backend` and `apps/web` are independent npm projects; there is no root workspace, no shared scripts, no single `npm run lint`. *Do:* add a minimal root `package.json` with npm workspaces (`apps/web`, `backend`) and top-level `lint` / `test` / `build` scripts. Do **not** introduce Turborepo/Nx — the gain does not justify it at two packages. **Priority: Medium** |
| **A6** | **`packages/{api,auth,models,ui,utils}` are empty `.gitkeep` folders** while `docs/structure.md` documents them as the shared layer. *Why:* the web and the Flutter app will duplicate the domain types once the mobile client talks to the API. *Do:* either populate `packages/models` + `packages/api` from the OpenAPI contract, or delete the folders and amend `docs/structure.md`. Decide with C1. **Priority: Medium** |
| **A7** | **`apps/web/src/features/<role>/` — six empty `.gitkeep` folders** for student/industry/faculty/mentor/ngo/university, while all code lives in `src/app/`. Three of the six roles (faculty, mentor, NGO, university) have **no screens at all**. *Do:* decide whether those roles are in scope; if not, delete the folders and record it. **Priority: Medium** |
| **A8** | **Two product identities.** Root `README.md` describes *JanMaang*, a Firebase/Vercel civic app with a `server/` directory that **does not exist**. `backend/README.md` describes *Jan Setu*, a NestJS/Neon platform. Package names say `jansetu-backend`; the Flutter app says `janmaang`. *Do:* pick one name, rewrite the root README as the monorepo entry point, move the civic-app narrative into `apps/citizen-app/README.md`. **Priority: High** |
| **A9** | **`DESIGN.md` §12 "Known gaps" is stale** — claims "No authentication", "No persistence", "`backend/` and `packages/` are empty by intent". Auth and persistence now partially exist. *Do:* rewrite §12 against reality after Stage 1. **Priority: Medium** |

### 1.2 Backend

| # | Item |
| --- | --- |
| **B1** | **~62 of 70 Prisma models have no API.** `schema.prisma` is 1,359 lines and models the entire product: sponsorship, funding, ledger, allocations, projects, milestones, pilots, documents, faculty, student teams, applications, mentorship, messaging, verification, objections, evidence, achievements, impact points, attachments, notifications, automations, clusters, citizen reports. Only `User`/`Role`/`Permission`/`Jurisdiction`/`Village`/`Department`/`Officer`/`Problem` are served. *Why:* every unbuilt frontend flow is blocked on these. *Do:* build module by module in the order in §3. *Deps:* none individually; ordered by frontend need. **Priority: Critical** |
| **B2** | **Citizen report intake does not exist.** `CitizenReport` is readable via `/gov/reports` but there is no `POST`. The mobile app's entire purpose is to create one. *Deps:* C1. **Priority: Critical** |
| **B3** | **Clustering is unimplemented.** `Cluster` / `ClusterProblem` models exist; nothing writes them. The product's core claim ("forty reports become one demand with the weight of forty") is not computed anywhere server-side. *Deps:* B2. **Priority: Critical** |
| **B4** | **OTP is never delivered.** `src/auth/otp.service.ts:52` — `TODO(stage 9): send via the SMS channel adapter.` Codes are echoed to the log under `OTP_DEV_ECHO`. Citizen login is impossible in production. *Deps:* provider choice. **Priority: Critical** |
| **B5** | **Password reset email is never sent.** `src/auth/auth.service.ts:159` — same TODO. The endpoint returns success and the user receives nothing. **Priority: High** |
| **B6** | **No file upload.** `Attachment`, `Evidence`, `ProjectDocument` models exist; R2 credentials are in `.env.example` and unused. Photo evidence is central to citizen verification. *Deps:* B2. **Priority: High** |
| **B7** | **No notifications delivery.** `Notification` model + `FCM_SERVICE_ACCOUNT_JSON` env var, no service, no endpoint. **Priority: High** |
| **B8** | **`Idempotency-Key` is forwarded by the web proxy but nothing consumes it.** `apps/web/src/app/api/gov/[...path]/route.ts` passes the header; no backend interceptor. Double-submitting a funding approval will double-apply. *Deps:* B1 funding module. **Priority: High** |
| **B9** | **Rate limiting is uniform.** One global throttler at 120 req/min. Auth endpoints (`login`, `otp/request`, `password/reset-request`) need their own much tighter bucket keyed on identifier, not just IP. **Priority: High** |
| **B10** | **No audit coverage outside problems.** `AuditEntry` is written by the problem lifecycle only; every other mutation will need it, and there is no generic interceptor. *Deps:* B1. **Priority: Medium** |
| **B11** | **e2e coverage is 4 specs** (auth, health, problems, scope). No coverage of geography, gov reference, or any module built from here. **Priority: High** |
| **B12** | **No observability.** pino logs to stdout; no error tracking (Sentry), no metrics, no request tracing, no uptime check beyond `/healthz`. **Priority: High** |
| **B13** | **`Dockerfile` CMD runs `prisma migrate deploy` on every boot** — `backend/README.md` claims migrations never race multiple instances, but the CMD does exactly that on a scaled deployment. *Do:* move migration to a release/pre-deploy step in the deploy workflow. **Priority: High** |
| **B14** | **Refresh-token reuse detection unverified.** Rotation exists; confirm a replayed refresh token revokes the family rather than just failing. **Priority: High** |
| **B15** | **`backend/api/`, `services/`, `models/`, `database/` are empty `.gitkeep` folders** that contradict the real `src/` NestJS layout and `backend/README.md`. *Do:* delete them; amend `docs/structure.md`. **Priority: Low** |
| **B16** | **No seeded production-shaped data path.** `db:seed` reproduces the web fixtures — right for dev, but there is no separate reference-data-only seed (jurisdictions, departments, roles, permissions) for a real deployment. **Priority: Medium** |

### 1.3 Web — authentication & authorization

| # | Item |
| --- | --- |
| **W1** | **The student surface has no authentication whatsoever.** `src/app/(app)/layout.tsx` renders the shell unconditionally; `/` redirects straight to `/dashboard`. Anyone can open every student screen. **Priority: Critical** |
| **W2** | **The industry portal has no authentication.** Same — `/industry/*` is fully public, including CSR spend figures and the redacted-challenge boundary that `visibility.ts` is built to enforce. **Priority: Critical** |
| **W3** | **No `middleware.ts`.** `/gov/*` is only protected *after* render: the layout mounts, the store fetches, the API client sees a 401 and does `window.location.assign('/gov-login')`. An unauthenticated visitor sees the gov chrome first. *Do:* add an edge middleware that checks the `js_at`/`js_rt` cookies and redirects before render. *Deps:* W1/W2 for the other surfaces. **Priority: Critical** |
| **W4** | **No role-based route gating server-side.** `lib/gov/rbac.ts` decides visibility in the client only; the permission list arrives from `/auth/me`, so it is correct, but a user can still route to a screen they lack permission for and see its skeleton. **Priority: High** |
| **W5** | **No sign-up / account provisioning flow anywhere.** Only `/gov-login` exists. **Priority: High** |
| **W6** | **No sign-out surface outside gov**, and no session-expiry UX besides a hard reload. **Priority: Medium** |

### 1.4 Web — data wiring

| # | Item |
| --- | --- |
| **W7** | **Gov reference reads are still fixtures despite live endpoints.** `src/lib/gov/service.ts` returns `OFFICERS`, `DEPARTMENTS`, `SPONSORS`, `VILLAGES`, `JURISDICTIONS`, `AUTOMATIONS`, `ALERTS`, `GOV_USERS`, `WEEKLY_TREND`, `REPORTS` from `mock-data.ts`, while `/api/v1/gov/{departments,officers,sponsors,automations,alerts,users,reports,analytics/weekly-trend}` and `/api/v1/geography/*` already serve exactly those shapes. **This is the single cheapest win in the repo.** *Deps:* none. **Priority: Critical** |
| **W8** | **15 gov mutations never persist.** `src/lib/gov/store.tsx` handles `sponsorship/invite`, `sponsorship/approve`, `sponsorship/decline`, `sponsorship/fallback`, `funding/approve`, `funding/reject`, `officer/assign`, `project/progress`, `project/complete`, `verification/request`, `verification/record`, `automation/toggle`, `alert/read` as pure reducer cases. Only `problem/validate`, `problem/reject`, `problem/route` and `weights/publish` call the API. Every other action is lost on reload — the gov workspace looks functional and is not. *Deps:* B1 (sponsorship, funding, projects, verification modules). **Priority: Critical** |
| **W9** | **The entire industry portal is mock.** `src/lib/industry/service.ts` — `USING_MOCK_DATA = true`, 18 screens, no endpoints exist. *Deps:* B1. **Priority: High** |
| **W10** | **The entire student surface is static.** `src/lib/data.ts` (982 lines) hard-codes navigation, dashboard metrics, opportunities, projects, applications, achievements, notifications — including a literal `badge: 3` on the notifications nav item. *Deps:* B1. **Priority: High** |
| **W11** | **CSR PDF export is explicitly unimplemented** — `src/app/industry/csr/page.tsx:298` renders "PDF export is not implemented yet". *Deps:* W9. **Priority: Low** |
| **W12** | **Council sessions are `sessionStorage`-only.** Closing the tab loses the sitting; there is no history, no sharing, no record. Deliberate per `session-store.ts`, but worth revisiting if verdicts should be citable. **Priority: Low** |

### 1.5 Web — UX, error handling, quality

| # | Item |
| --- | --- |
| **W13** | **No `error.tsx`, `not-found.tsx` or `global-error.tsx` anywhere in `src/app`.** Any thrown render error shows the raw Next error page in dev and a blank screen in prod. **Priority: Critical** |
| **W14** | **One `loading.tsx` in the whole app** (`(app)/loading.tsx`). `/gov` and `/industry` have no route-level loading states; the gov store hydrates client-side with no skeleton. **Priority: High** |
| **W15** | **Empty states are inconsistent.** Filter-driven screens (problems, discover, opportunities, problem-explorer) need audited zero-result states. **Priority: Medium** |
| **W16** | **No form validation library or consistent error display.** Forms in `/collaborate/new`, `/council/new`, gov dialogs validate ad hoc. **Priority: Medium** |
| **W17** | **i18n exists but covers only the council.** `src/lib/i18n/strings.ts` has en/hi and is consumed by 4 council files. Every other screen is hard-coded English — in a product for rural Indian citizens. *Do:* decide scope; at minimum make the decision explicit in `DESIGN.md`. **Priority: Medium** |
| **W18** | **No accessibility verification.** `DESIGN.md` §5 states accessibility rules; nothing tests them. No axe run, no keyboard-navigation pass, no focus-trap audit on the dialogs. **Priority: High** |
| **W19** | **Zero automated tests in `apps/web`.** No unit tests for `lib/gov/priority.ts`, `lib/gov/rbac.ts`, `lib/industry/visibility.ts`, `lib/council/verdict.ts` — the four modules where a bug is a correctness or a **disclosure** failure. No component tests, no e2e. **Priority: Critical** |
| **W20** | **`npm run lint` is never run in CI for the web app.** **Priority: High** |
| **W21** | **No performance work.** Every gov and industry screen is client-rendered from a context store; no `revalidate`, no RSC data fetching, no bundle budget, no Leaflet code-split verification, no image optimisation config. `.next` is 1.6 GB locally (dev artefacts, not shipped, but worth a `clean` script). **Priority: Medium** |

### 1.6 Web — security

| # | Item |
| --- | --- |
| **W22** | **Council API routes are unauthenticated and unrate-limited.** `/api/council/turn`, `/api/council/verdict`, `/api/council/speech` accept any POST and each spends Groq quota. A public deployment is a metered-billing abuse target. *Do:* require a session + per-session/per-IP rate limit. *Deps:* W1. **Priority: Critical** |
| **W23** | **No security headers on the Next app.** The backend has `@fastify/helmet`; the web app sets no CSP, HSTS, `X-Frame-Options`, or `Referrer-Policy`. **Priority: High** |
| **W24** | **Cookies are `sameSite: lax` with no CSRF defence on the proxy.** `/api/gov/[...path]` forwards any same-origin POST with the session cookie attached. Add a CSRF token or `sameSite: strict` for mutating methods. **Priority: High** |
| **W25** | **Secrets audit is clean** — `.env`, `.env.local`, `.env.local.save` are all correctly gitignored and nothing sensitive is tracked. *No action; verified.* **Priority: — (pass)** |

### 1.7 Mobile — Flutter citizen app

| # | Item |
| --- | --- |
| **C1** | **Backend contradiction.** The app is built against **Firebase** — `apps/citizen-app/firebase/` holds `firestore.rules`, `storage.rules` and four Cloud Functions (`analyzeReport`, `clusterDemand`, `computePriority`, `submitVerification`) — while `backend/README.md` states the Flutter app consumes the NestJS REST API and "there is **one** backend". These are two implementations of the same business logic. **This decision blocks C2–C6 and B2/B3.** *Recommendation:* keep the NestJS backend (it holds the RBAC, jurisdiction scoping and priority engine the gov workspace already depends on) and retire the Cloud Functions. **Priority: Critical** |
| **C2** | **Every repository is in-memory.** `lib/core/providers.dart` wires `MockAuthRepository`, `MockDemandsRepository`, `MockReportRepository`, `MockVerificationRepository`, `MockLedgerRepository`. `AppConfig.useMocks` defaults `true`. **The app has never talked to any server.** *Deps:* C1. **Priority: Critical** |
| **C3** | **Firebase initialisation is commented out.** `lib/bootstrap.dart:20` — `TODO(firebase)`; passing `USE_MOCKS=false` today only prints a debug warning. *Deps:* C1 (may be deleted outright). **Priority: Critical** |
| **C4** | **5 widget tests fail.** `test/widget/home_screen_test.dart` (3) and `test/widget/router_smoke_test.dart` (2) assert copy that a redesign removed — e.g. `Found 0 widgets with text "Make your community heard."`. A red suite means no regression signal. *Deps:* none. **Priority: Critical** |
| **C5** | **No generated API client.** `backend/README.md`: "The Flutter client is generated from it [`openapi.json`]." No generator, no config, no generated code exists. *Deps:* C1. **Priority: High** |
| **C6** | **No push notification handling, no deep links, no offline queue** — all three matter for a rural-connectivity citizen app that files reports from the field. *Deps:* C1, B7. **Priority: High** |
| **C7** | **Maps are disabled.** `MAPS_ENABLED=false`; the map surfaces render a styled placeholder pending a platform API key in the native manifests. *Note:* `flutter_map`/OSM is already in the tree and the test output carries the OSM tile-usage warning — confirm which map stack ships. **Priority: High** |
| **C8** | **`flutter analyze` info:** unnecessary `package:characters` import at `lib/features/home/presentation/home_screen.dart:1`. **Priority: Low** |
| **C9** | **68 dependencies are behind.** `flutter pub outdated` reports newer versions blocked by constraints. **Priority: Low** |
| **C10** | **No release configuration** — no signing config, no store metadata, no build flavours (dev/staging/prod), no crash reporting. **Priority: High** |

### 1.8 CI/CD, deployment, production readiness

| # | Item |
| --- | --- |
| **D1** | **Only `backend-ci.yml` exists.** It is good — Postgres service, lint, `tsc`, unit, migrate, seed, e2e, OpenAPI drift check, build. Use it as the template. **Priority: — (pass)** |
| **D2** | **No CI for `apps/web`** — no lint, no typecheck, no build, no tests on PR. **Priority: Critical** |
| **D3** | **No CI for `apps/citizen-app`** — no `flutter analyze`, no `flutter test`. This is why C4 went unnoticed. **Priority: Critical** |
| **D4** | **No deployment pipeline at all.** `backend/README.md` names Railway (staging + prod) and Neon branches; nothing implements it. No web hosting config either. **Priority: Critical** |
| **D5** | **No staging environment.** **Priority: High** |
| **D6** | **No database backup / restore / migration-rollback procedure.** **Priority: Critical** |
| **D7** | **No dependency automation** (Dependabot/Renovate), **no CodeQL**, **no secret scanning** workflow. **Priority: Medium** |
| **D8** | **No monitoring or alerting** — no uptime check, no error budget, no log aggregation, no on-call path. *Deps:* B12. **Priority: High** |
| **D9** | **No runbook, no incident procedure, no rollback plan.** **Priority: High** |
| **D10** | **No API documentation beyond `openapi.json`** — no published docs site, no changelog, no versioning policy past the `/v1` prefix. **Priority: Medium** |
| **D11** | **No `CONTRIBUTING.md`, no PR template, no commit convention enforcement**, despite a clean conventional-commit history. **Priority: Low** |
| **D12** | **`SECURITY.md` exists at root and in `apps/citizen-app`** — verify both are current and point at a real contact. **Priority: Low** |

---

## 2. Master task list

Status is `Pending` for all. `Blocks` names the tasks that cannot start until this one lands.

| ID | Task | Area | Priority | Deps | Stage | Blocks |
| --- | --- | --- | --- | --- | --- | --- |
| **T-001** | Decide: NestJS backend vs Firebase for the citizen app; record in an ADR | Architecture | Critical | — | 0 | T-040…T-047, T-012, T-013 |
| **T-002** | Decide: product name (Jan Setu vs JanMaang); record in an ADR | Architecture | Critical | — | 0 | T-005 |
| **T-003** | Decide: scope of student/industry surfaces (API-backed vs labelled demo) | Product | Critical | — | 0 | T-030…T-039 |
| **T-004** | Decide: faculty / mentor / NGO / university roles in or out of scope | Product | High | — | 0 | T-006 |
| **T-005** | Rewrite root `README.md` as the monorepo entry point under the chosen name | Docs | High | T-002 | 0 | — |
| **T-006** | Delete or populate `packages/*` and `src/features/<role>/`; amend `docs/structure.md` | Architecture | Medium | T-001, T-004 | 0 | — |
| **T-007** | Delete the orphaned root Flutter project (A1) | Hygiene | High | — | 1 | — |
| **T-008** | `git rm -r apps/citizen-app/_to_delete` | Hygiene | High | — | 1 | — |
| **T-009** | Delete orphan root `package-lock.json`; add npm-workspace root `package.json` | Hygiene | Medium | — | 1 | T-010 |
| **T-010** | Rename `apps/web` package from `tmp_next` to `@jansetu/web` | Hygiene | Medium | T-009 | 1 | — |
| **T-011** | Delete empty `backend/{api,services,models,database}` `.gitkeep` folders | Hygiene | Low | — | 1 | — |
| **T-012** | Fix the 5 failing Flutter widget tests (C4) | Mobile | Critical | — | 1 | T-016 |
| **T-013** | Remove the unnecessary `characters` import (C8) | Mobile | Low | — | 1 | — |
| **T-014** | Add `web-ci.yml`: lint + `tsc --noEmit` + `next build` on PR | CI | Critical | T-010 | 1 | T-024 |
| **T-015** | Add `flutter-ci.yml`: `flutter analyze` + `flutter test` on PR | CI | Critical | T-012 | 1 | — |
| **T-016** | Wire gov reference reads in `service.ts` to the live endpoints (W7) | Web | Critical | — | 1 | T-031 |
| **T-017** | Add `error.tsx` + `not-found.tsx` per route group, `global-error.tsx` at root | Web | Critical | — | 1 | — |
| **T-018** | Add `loading.tsx` for `/gov` and `/industry`; skeletons for store hydration | Web | High | — | 1 | — |
| **T-019** | Add `middleware.ts` gating `/gov/*` on the session cookie before render | Web/Auth | Critical | — | 2 | T-020 |
| **T-020** | Extend auth to the student surface: login, session, route gate (W1) | Web/Auth | Critical | T-019 | 2 | T-022, T-036 |
| **T-021** | Extend auth to the industry portal (W2) | Web/Auth | Critical | T-019 | 2 | T-034 |
| **T-022** | Authenticate + rate-limit the council API routes (W22) | Web/Security | Critical | T-020 | 2 | — |
| **T-023** | Server-side role gating for gov/industry routes (W4) | Web/Auth | High | T-019 | 2 | — |
| **T-024** | Unit tests for `gov/priority.ts`, `gov/rbac.ts`, `industry/visibility.ts`, `council/verdict.ts` | Web/Test | Critical | T-014 | 2 | — |
| **T-025** | Per-identifier rate limiting on auth endpoints (B9) | Backend/Security | High | — | 2 | — |
| **T-026** | Verify + harden refresh-token reuse detection (B14) | Backend/Security | High | — | 2 | — |
| **T-027** | Deliver OTP via a real SMS provider (B4) | Backend | Critical | — | 2 | T-046 |
| **T-028** | Deliver password-reset email (B5) | Backend | High | — | 2 | — |
| **T-029** | Sign-up / account provisioning flow (W5) | Web+Backend | High | T-020 | 2 | — |
| **T-030** | Backend: sponsorship module (invite, approve, decline, fallback) | Backend | Critical | — | 3 | T-031 |
| **T-031** | Backend: funding + ledger + allocation module (approve, reject) | Backend | Critical | T-030 | 3 | T-032 |
| **T-032** | Backend: projects, milestones, pilots, documents module | Backend | Critical | T-031 | 3 | T-033 |
| **T-033** | Backend: verification, objections, evidence module | Backend | Critical | T-032 | 3 | T-037 |
| **T-034** | Backend: officer assignment + automation execution | Backend | High | T-030 | 3 | — |
| **T-035** | Idempotency-key interceptor for all mutating endpoints (B8) | Backend | High | T-031 | 3 | — |
| **T-036** | Generic audit interceptor across all mutations (B10) | Backend | Medium | T-030 | 3 | — |
| **T-037** | Replace the 15 client-only gov store actions with API calls (W8) | Web | Critical | T-030…T-034 | 3 | — |
| **T-038** | Backend: industry domain (challenges, applications, mentorship, messaging, CSR) | Backend | High | T-003, T-032 | 4 | T-039 |
| **T-039** | Wire the industry portal to the API; flip `USING_MOCK_DATA` (W9) | Web | High | T-038 | 4 | — |
| **T-040** | Backend: student domain (teams, applications, opportunities, achievements, impact points, notifications) | Backend | High | T-003 | 4 | T-041 |
| **T-041** | Replace `lib/data.ts` fixtures with API reads (W10) | Web | High | T-040 | 4 | — |
| **T-042** | Backend: citizen report intake endpoint (B2) | Backend | Critical | T-001 | 4 | T-043, T-047 |
| **T-043** | Backend: clustering engine (B3) | Backend | Critical | T-042 | 4 | — |
| **T-044** | Backend: attachment/evidence upload via R2 (B6) | Backend | High | T-042 | 4 | T-047 |
| **T-045** | Backend: notification delivery incl. FCM (B7) | Backend | High | — | 4 | T-048 |
| **T-046** | Generate the Flutter API client from `openapi.json` (C5) | Mobile | High | T-001, T-027 | 5 | T-047 |
| **T-047** | Replace the Flutter mock repositories with API-backed ones (C2, C3) | Mobile | Critical | T-042, T-044, T-046 | 5 | T-048 |
| **T-048** | Flutter push notifications, deep links, offline report queue (C6) | Mobile | High | T-045, T-047 | 5 | — |
| **T-049** | Resolve the map stack and provision keys (C7) | Mobile | High | T-001 | 5 | — |
| **T-050** | Flutter build flavours, signing, crash reporting (C10) | Mobile | High | T-047 | 5 | T-062 |
| **T-051** | Backend e2e coverage for every new module (B11) | Test | High | T-030…T-045 | 6 | — |
| **T-052** | Web component + integration tests for the critical flows | Test | High | T-024 | 6 | — |
| **T-053** | End-to-end browser tests (Playwright) for login → problem → route → fund | Test | High | T-037 | 6 | — |
| **T-054** | Restore the Flutter widget/integration suite to meaningful coverage | Test | High | T-012, T-047 | 6 | — |
| **T-055** | Accessibility audit + fixes against `DESIGN.md` §5 (W18) | Quality | High | T-017, T-018 | 6 | — |
| **T-056** | Empty/loading/error state audit across all 54 web routes (W14, W15) | Quality | Medium | T-017 | 6 | — |
| **T-057** | Consistent form validation + error display (W16) | Quality | Medium | — | 6 | — |
| **T-058** | Security headers / CSP on the Next app (W23) | Security | High | — | 6 | — |
| **T-059** | CSRF defence on the gov proxy (W24) | Security | High | T-019 | 6 | — |
| **T-060** | Performance pass: RSC data fetching, caching, bundle budget (W21) | Performance | Medium | T-037 | 6 | — |
| **T-061** | Error tracking + metrics + tracing, backend and web (B12) | Ops | High | — | 7 | T-066 |
| **T-062** | Deploy pipeline: backend → Railway, web → Vercel, mobile → stores (D4) | CI/CD | Critical | T-014, T-015, T-050 | 7 | T-063 |
| **T-063** | Staging environment on Neon branch + staging services (D5) | CI/CD | High | T-062 | 7 | T-064 |
| **T-064** | Move `prisma migrate deploy` out of the Docker CMD into a release step (B13) | CI/CD | High | T-062 | 7 | — |
| **T-065** | Database backup, restore drill, migration rollback procedure (D6) | Ops | Critical | T-063 | 7 | — |
| **T-066** | Uptime monitoring + alerting + log aggregation (D8) | Ops | High | T-061 | 7 | — |
| **T-067** | Dependabot/Renovate, CodeQL, secret scanning (D7) | CI/CD | Medium | T-014 | 7 | — |
| **T-068** | Production reference-data seed, separate from the fixture seed (B16) | Backend | Medium | T-063 | 7 | — |
| **T-069** | i18n decision + rollout beyond the council (W17) | Product | Medium | T-003 | 8 | — |
| **T-070** | Rewrite `DESIGN.md` §12 against reality (A9) | Docs | Medium | T-037 | 8 | — |
| **T-071** | Runbook, incident procedure, rollback plan (D9) | Docs | High | T-065 | 8 | — |
| **T-072** | Publish API docs, changelog, versioning policy (D10) | Docs | Medium | T-051 | 8 | — |
| **T-073** | `CONTRIBUTING.md`, PR template, commit convention (D11) | Docs | Low | — | 8 | — |
| **T-074** | Verify both `SECURITY.md` files (D12) | Docs | Low | T-002 | 8 | — |
| **T-075** | CSR PDF export (W11) | Web | Low | T-039 | 8 | — |
| **T-076** | Flutter dependency upgrades (C9) | Mobile | Low | T-054 | 8 | — |
| **T-077** | Final QA pass + production readiness checklist sign-off | QA | Critical | all | 8 | — |

---

## 3. Stage-wise roadmap

### Stage 0 — Decisions (blocking, ~half a day, no code)

**Tasks:** T-001 → T-006.
**Order:** T-001 and T-002 in parallel (independent), then T-003, T-004, then T-005 and T-006.
**Why first:** T-001 determines whether ~15 mobile tasks and 2 backend modules are built against Firebase or NestJS. Starting any of them before deciding risks building the wrong half twice — which is exactly what has already happened once (`firebase/functions/computePriority.ts` duplicates `backend/src/problems/priority/priority.engine.ts`).
**Definition of done:** four short ADRs in `docs/adr/`, each one page: context, decision, consequences. `docs/structure.md` amended.
**Repo after:** unchanged code; unambiguous direction.

### Stage 1 — Hygiene, green tests, cheap wins (~3–4 days)

**Tasks:** T-007 … T-018.
**Order:**
1. **Parallel, independent:** T-007, T-008, T-011, T-013 (deletions — do these first, they shrink the surface everything else touches).
2. T-012 (fix red Flutter tests) — before T-015, or CI lands red.
3. T-009 → T-010 (workspace root, then rename).
4. T-014 and T-015 (CI) once T-010 and T-012 are in.
5. **Parallel:** T-016 (gov reference wiring), T-017 (error boundaries), T-018 (loading states).
**Can run in parallel:** the deletion group; T-016/T-017/T-018 touch different files.
**Must finish before Stage 2:** T-014 and T-015 — every later stage relies on CI catching regressions.
**Definition of done:** `flutter test` green; `web-ci` and `flutter-ci` green on a PR; the gov workspace reads officers/departments/sponsors/villages/jurisdictions/automations/alerts/users/trend from the API, `mock-data.ts` no longer imported by `service.ts`; every route group has an error boundary; root contains no orphaned Flutter project.
**Repo after:** one honest tree, three green pipelines, the gov workspace fully backed by the API for everything it can already read.

### Stage 2 — Authentication, authorization, security baseline (~1 week)

**Tasks:** T-019 … T-029.
**Order:**
1. T-019 (middleware) — **first**, it is the mechanism the next two reuse.
2. **Parallel:** T-020 (student auth), T-021 (industry auth), T-025 (auth rate limits), T-026 (refresh reuse), T-027 (SMS), T-028 (email).
3. T-022 (council gating) after T-020 — it needs the student session.
4. T-023 (role gating) after T-019.
5. T-024 (the four critical unit-test modules) — start as soon as T-014 is in; it does not block.
6. T-029 (sign-up) last in the stage.
**Must finish before Stage 3:** T-019, T-020, T-021, T-022. Building new mutations onto an unauthenticated surface means retrofitting authorization into every one of them.
**Definition of done:** no route in any surface renders for an unauthenticated visitor; council endpoints reject anonymous callers and rate-limit per session; OTP and password-reset actually reach a phone and an inbox; `rbac.ts`, `visibility.ts`, `priority.ts` and `verdict.ts` have unit tests; a replayed refresh token revokes the family.
**Repo after:** every surface behind a session, the disclosure boundary tested, no anonymous LLM spend.

### Stage 3 — The government workspace becomes real (~2 weeks)

This is the highest-value stage: the gov workspace is the most complete surface and the one where "looks finished but isn't" is most dangerous.

**Tasks:** T-030 … T-037.
**Order (strictly sequential on the backend, because the models chain):**
1. T-030 sponsorship — `Sponsorship`, `SponsorshipMatch`.
2. T-031 funding — `Funding`, `FundingCommitment`, `LedgerEntry`, `Allocation`. Depends on sponsorship producing the commitment.
3. T-032 projects — `Project`, `Milestone`, `Pilot`, `ProjectDocument`. Depends on an allocation existing.
4. T-033 verification — `Verification`, `VerificationRequest`, `RankingObjection`, `Evidence`. Depends on a project to verify.
5. T-034 officer assignment + automations — can start in **parallel with T-031** once T-030 lands.
6. T-035 idempotency and T-036 audit — in parallel from the moment T-031 exists; retrofit onto T-030 as you go.
7. T-037 — the web store rewrite. Do it **incrementally, one action at a time as each backend module lands**, not as one big-bang at the end. Each gov store case becomes an API call the day its endpoint exists.
**Parallelisable:** T-034 with T-031/T-032; T-035 and T-036 alongside everything; T-037 follows each module by a day.
**Must finish before Stage 4:** all of it. The industry and student domains reuse the project/funding/verification models.
**Definition of done:** no reducer case in `src/lib/gov/store.tsx` mutates state without a corresponding persisted API call; a hard reload of any gov screen shows the same data; every mutation writes an `AuditEntry`; a replayed `Idempotency-Key` returns the original result; e2e specs cover each new module.
**Repo after:** the government workspace is genuinely production-functional end to end.

### Stage 4 — Industry, student and citizen-intake domains (~2–3 weeks)

**Tasks:** T-038 … T-045.
**Order:**
1. **Parallel tracks** (three independent domains, three developers if available):
   - **Track A:** T-038 (industry backend) → T-039 (industry wiring).
   - **Track B:** T-040 (student backend) → T-041 (`data.ts` replacement).
   - **Track C:** T-042 (citizen intake) → T-043 (clustering), plus T-044 (uploads).
2. T-045 (notifications) in parallel with all three — it is a cross-cutting service every track needs.
**Dependencies:** Track A needs T-032 (projects) from Stage 3. Track C's T-043 is the product's core claim and deserves its own dedicated unit-test suite in the same way `priority.engine.ts` has one.
**Must finish before Stage 5:** T-042, T-044, T-045 — the mobile app is a client of all three.
**Definition of done:** `USING_MOCK_DATA` is gone from `lib/industry/service.ts`; `lib/data.ts` holds navigation and copy only, no domain data; a report POSTed to the intake endpoint is clustered and appears in the gov problem list; an uploaded photo lands in R2 and is retrievable through a signed URL.
**Repo after:** every web surface reads and writes the one backend. No fixtures in any service layer.

### Stage 5 — Mobile app on the real backend (~2 weeks)

**Tasks:** T-046 … T-050.
**Order:** T-046 (generate the client) → T-047 (swap the repositories, one at a time behind `AppConfig.useMocks` so the mock path keeps working for tests) → **parallel** T-048 (push/deep links/offline) and T-049 (maps) → T-050 (flavours, signing, crash reporting).
**Dependencies:** all of it on T-001; T-047 on T-042/T-044/T-046; T-048 on T-045.
**Definition of done:** `--dart-define=USE_MOCKS=false` runs the app against a staging backend and a citizen can complete report → track → verify; `firebase/functions/` is either deleted or reduced to the services actually retained (per T-001); the mock repositories survive as test doubles only.
**Repo after:** one backend, three clients, no duplicated business logic.

### Stage 6 — Testing, quality, security hardening (~1.5 weeks)

**Tasks:** T-051 … T-060.
**Order:**
1. **Parallel:** T-051 (backend e2e), T-052 (web tests), T-054 (Flutter tests) — three suites, three owners.
2. T-053 (Playwright) after T-052 establishes the test infrastructure.
3. **Parallel:** T-055 (accessibility), T-056 (states audit), T-057 (forms).
4. **Parallel:** T-058 (CSP), T-059 (CSRF).
5. T-060 (performance) last — optimise only what the finished flows show is slow.
**Must finish before Stage 7:** T-051, T-052, T-053. A deploy pipeline without a test gate is a faster way to ship bugs.
**Definition of done:** coverage thresholds enforced in CI; a Playwright run covers login → problem → validate → route → sponsor → fund → project → verify; axe reports zero critical violations; CSP is in enforce mode, not report-only.
**Repo after:** a regression suite that makes the next change safe.

### Stage 7 — CI/CD, deployment, operations (~1 week)

**Tasks:** T-061 … T-068.
**Order:**
1. T-061 (observability) — instrument **before** deploying, so the first production error is visible.
2. T-062 (deploy pipeline) → T-063 (staging) → T-064 (migration release step).
3. T-065 (backup + restore drill) — **actually restore**, do not just enable backups.
4. T-066 (monitoring/alerting) after T-061 and T-063.
5. **Parallel:** T-067 (dependency + code scanning), T-068 (production seed).
**Must finish before Stage 8:** T-062 through T-066. Stage 8 is verification, and there is nothing to verify without a deployed staging environment.
**Definition of done:** a merge to `main` deploys to staging automatically; a tagged release deploys to production behind a manual approval; migrations run once per release, not per instance boot; a restore from backup has been performed and timed; an alert fires to a real destination on a synthetic 500.
**Repo after:** deployable, observable, recoverable.

### Stage 8 — Production readiness (~1 week)

**Tasks:** T-069 … T-077.
**Order:** T-069, T-070, T-071, T-072, T-073, T-074, T-075, T-076 in parallel; T-077 (final QA) last, gating the launch.
**Definition of done:** the checklist in §6 is fully ticked with evidence — a link, a screenshot or a CI run per line.
**Repo after:** production.

---

## 4. Dependency map

```
STAGE 0 ── decisions
  T-001 (backend choice) ─────────────┬──► T-042 ──► T-043
                                      ├──► T-046 ──► T-047 ──► T-048
                                      ├──► T-049
                                      └──► T-006
  T-002 ──► T-005, T-074
  T-003 ──┬──► T-038 ──► T-039
          ├──► T-040 ──► T-041
          └──► T-069
  T-004 ──► T-006

STAGE 1 ── hygiene + green CI
  T-007, T-008, T-011, T-013   (independent, parallel)
  T-009 ──► T-010 ──► T-014 ──┬──► T-024
                              └──► T-067
  T-012 ──► T-015
  T-016   (independent — the cheapest high-value task in the repo)
  T-017 ──► T-056
  T-018

STAGE 2 ── auth + security baseline
  T-019 ──┬──► T-020 ──┬──► T-022
          │            ├──► T-029
          │            └──► T-036(web side)
          ├──► T-021 ──► T-039
          ├──► T-023
          └──► T-059
  T-025, T-026, T-027, T-028   (parallel, independent)
  T-027 ──► T-046

STAGE 3 ── gov workspace persistence   [the critical chain]
  T-030 ──► T-031 ──► T-032 ──► T-033
    │         │         │         │
    │         │         │         └──► T-037(verification actions)
    │         │         └──► T-038, T-037(project actions)
    │         ├──► T-035
    │         └──► T-037(funding actions)
    ├──► T-034 ──► T-037(officer/automation actions)
    └──► T-036

STAGE 4 ── remaining domains   [three parallel tracks]
  A: T-032 ──► T-038 ──► T-039
  B: T-003 ──► T-040 ──► T-041
  C: T-042 ──┬──► T-043
             └──► T-044 ──► T-047
  X: T-045 ──► T-048          (cross-cutting, parallel with A/B/C)

STAGE 5 ── mobile
  T-046 ──► T-047 ──┬──► T-048
                    ├──► T-050 ──► T-062
                    └──► T-054
  T-049   (parallel)

STAGE 6 ── tests + hardening
  T-051, T-052, T-054   (parallel)
  T-052 ──► T-053
  T-055, T-056, T-057, T-058, T-059, T-060   (parallel)

STAGE 7 ── ship
  T-061 ──► T-066
  T-062 ──► T-063 ──┬──► T-064
                    ├──► T-065 ──► T-071
                    └──► T-068
  T-067   (parallel)

STAGE 8 ── T-069…T-076 (parallel) ──► T-077 (gate)
```

**The critical path** is: `T-001 → T-030 → T-031 → T-032 → T-033 → T-037 → T-042 → T-047 → T-062 → T-065 → T-077`. Everything else can be scheduled around it.

---

## 5. Recommended execution order

Compressed to a single ordered list. Items on the same numbered line can run concurrently.

1. T-001, T-002, T-003, T-004 *(decisions — nothing else starts cleanly without these)*
2. T-005, T-006
3. T-007, T-008, T-011, T-012, T-013 *(deletions + red tests)*
4. T-009 → T-010
5. T-014, T-015 *(CI gates — everything after this is protected)*
6. T-016, T-017, T-018 *(cheap, visible wins)*
7. T-019 *(the auth mechanism)*
8. T-020, T-021, T-025, T-026, T-027, T-028 *(parallel auth work)*
9. T-022, T-023, T-024, T-029
10. T-030 → T-031 → T-032 → T-033 *(the gov chain; T-034, T-035, T-036, T-037 tracking alongside)*
11. T-038+T-039 ‖ T-040+T-041 ‖ T-042+T-043+T-044 ‖ T-045 *(four parallel tracks)*
12. T-046 → T-047 → T-048 ‖ T-049 → T-050
13. T-051, T-052, T-054 → T-053
14. T-055, T-056, T-057, T-058, T-059, T-060
15. T-061 → T-062 → T-063 → T-064, T-065, T-066 ‖ T-067, T-068
16. T-069 … T-076
17. T-077

---

## 6. Production readiness checklist

Every line needs evidence — a CI run, a link, a screenshot, a timed drill.

**Functionality**
- [ ] No screen displays data that a reload discards
- [ ] No `USING_MOCK_DATA`, no fixture import in any `service.ts`
- [ ] Every documented flow completes end to end on staging
- [ ] Citizen report → cluster → priority → route → sponsor → fund → project → verify works as one chain
- [ ] Mobile app runs against staging with `USE_MOCKS=false`

**Authentication & authorization**
- [ ] Every route requires a session; no surface renders for an anonymous visitor
- [ ] Role/permission checks enforced server-side, not only in the client
- [ ] Jurisdiction scoping verified by e2e tests against a sibling jurisdiction
- [ ] OTP and password reset actually deliver
- [ ] Refresh-token reuse revokes the token family
- [ ] Session expiry and sign-out behave correctly on every surface

**Security**
- [ ] CSP in enforce mode; HSTS, `X-Frame-Options`, `Referrer-Policy` set
- [ ] CSRF protection on all mutating requests
- [ ] Rate limits: global, per-endpoint, and per-identifier on auth
- [ ] No LLM endpoint reachable without a session
- [ ] Dependency scan clean; secret scanning enabled; no secret in git history
- [ ] Security review performed against `SECURITY.md`

**Data**
- [ ] Automated backups enabled **and a restore has been performed and timed**
- [ ] Migration rollback procedure written and rehearsed
- [ ] Production reference-data seed distinct from the fixture seed
- [ ] PII handling and retention documented

**Quality**
- [ ] All three CI pipelines green on `main`
- [ ] Coverage thresholds enforced; the four disclosure-critical modules at high coverage
- [ ] Playwright suite covers the critical path
- [ ] Zero critical axe violations; keyboard navigation verified
- [ ] Loading, empty and error states on all 54 web routes

**Operations**
- [ ] Error tracking live on backend, web and mobile
- [ ] Uptime monitoring with alerts to a real destination
- [ ] Log aggregation with retention
- [ ] Runbook, incident procedure and rollback plan published
- [ ] Staging mirrors production

**Documentation**
- [ ] Root README is accurate and matches the chosen product name
- [ ] `docs/structure.md` matches the actual tree
- [ ] `DESIGN.md` §12 reflects reality
- [ ] API docs published; `openapi.json` drift-checked in CI *(already enforced)*
- [ ] `CONTRIBUTING.md` and PR template in place

---

## 7. What to do first

Do these, in this order, before anything else.

**1. Write the backend ADR (T-001) — half a day, no code.**
`apps/citizen-app/firebase/functions/computePriority.ts` and
`backend/src/problems/priority/priority.engine.ts` are two implementations of
the same ranking. `backend/README.md` says there is one backend; the Flutter
tree says otherwise. Until this is written down, roughly a third of the
remaining work is pointed at a target that may not exist. **Recommendation:**
keep NestJS — it already holds RBAC, jurisdiction scoping and the priority
engine the gov workspace depends on — and retire the Cloud Functions.

**2. Fix the five failing Flutter tests (T-012) — a few hours.**
`flutter test` is red on `main`'s lineage right now. The failures are stale copy
assertions (`Found 0 widgets with text "Make your community heard."`), not real
defects — which is worse, because a suite nobody trusts stops being read. Fix
them before adding Flutter CI, or the pipeline lands red on day one.

**3. Wire the gov reference reads (T-016) — half a day.**
`/api/v1/gov/departments`, `/officers`, `/sponsors`, `/automations`, `/alerts`,
`/users`, `/reports`, `/analytics/weekly-trend` and `/api/v1/geography/*` are
**already built, tested and serving the exact shapes** the web app needs — and
`apps/web/src/lib/gov/service.ts` still returns `mock-data.ts` fixtures for all
of them. This is finished backend work sitting unused. Highest value per hour in
the repo.

**4. Add the two missing CI workflows (T-014, T-015) — half a day.**
`backend-ci.yml` is a good template: copy its shape. Without web and Flutter
gates, every subsequent stage risks silent regressions — which is exactly how
item 2 happened.

**5. Add error boundaries and loading states (T-017, T-018) — one day.**
Zero `error.tsx` / `not-found.tsx` / `global-error.tsx` across 54 routes means
any render error is a blank page in production. Cheap, mechanical, and it stops
being cheap once there are more screens.

Then start Stage 2 (authentication) — it is the hard gate before any new
mutation is written, because retrofitting authorization into thirty endpoints
costs far more than building them behind it.
