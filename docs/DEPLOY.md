# Deploying Jan Setu

Three services, all on free tiers, none of which need a card:

| Piece | Host | Why this one |
| --- | --- | --- |
| Postgres | **Neon** | Branchable, and the Prisma schema already expects the pooled/direct split |
| API (`backend/`) | **Railway** | Runs the Dockerfile as-is and has a real pre-deploy hook for migrations |
| Web (`apps/web/`) | **Vercel** | Next.js 16 with a proxy (edge middleware); anywhere else this is work |

Do them in that order — the API needs the database, and the web app needs the
API's URL.

---

## 1. Database — Neon

1. Create a project at <https://neon.tech>. Region: choose the one nearest your
   Railway region (`ap-southeast-1` pairs with Railway's Singapore).
2. From the dashboard copy **two** connection strings:
   - the **pooled** one (host contains `-pooler`) → `DATABASE_URL`
   - the **direct** one (no `-pooler`) → `DIRECT_URL`

   Both need `?sslmode=require`. The split is not optional: Prisma's migration
   engine needs a session connection and will fail against the pooler, while the
   running app needs the pooler or it will exhaust connections.

---

## 2. API — Railway

1. New project → **Deploy from GitHub repo** → pick this repo. (If you would
   rather deploy only from the `deploy-api` workflow, disconnect the GitHub
   source afterwards — otherwise every push deploys twice, once from each, and
   the two race the pre-deploy migration hook.)
2. Set the service **Root Directory** to `backend`. Railway then picks up
   [`backend/railway.json`](../backend/railway.json), which already declares the
   Dockerfile build, the `/healthz` check and the pre-deploy migration.
3. Add the variables from
   [`backend/.env.production.example`](../backend/.env.production.example).
   The four that must be right:

   ```
   DATABASE_URL     the Neon pooled string
   DIRECT_URL       the Neon direct string
   JWT_ACCESS_SECRET    node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   JWT_REFRESH_SECRET   run it again — a different value
   ```

   Leave `PORT` unset; Railway injects it.
4. Deploy. `preDeployCommand` runs `prisma migrate deploy` once against
   `DIRECT_URL` before the new version takes traffic.
5. Generate a public domain, then come back and set `PUBLIC_API_URL` to it.
6. Check it:

   ```bash
   curl https://your-backend.up.railway.app/readyz
   ```

   `{"status":"ok","database":"ok"}` means the schema is live and reachable.
   `/healthz` answers without touching the database, so a green `/healthz` and a
   red `/readyz` is always a database problem, never the app.

### Seeding

The seed is written for demonstration: it creates the Ranchi jurisdictions, 8
villages, 5 departments, 5 delivery officers, 12 problems carrying 96 citizen
reports, 69 votes, 12 evidence objects, 7 delivery ratings, the BIT Mesra
institute, the industry partner and 41 accounts in all. It is what makes a
fresh deploy show a working product instead of empty tables.

It **refuses to run** when `NODE_ENV` is `production` or `staging` — the first
line of `prisma/seed.ts` throws. That guard exists because the seed begins by
wiping every table, and a deploy is exactly the context in which someone runs
the wrong command in the wrong shell. To seed a fresh production database you
have to say so on purpose, once, from the Railway service shell:

```bash
NODE_ENV=development npm run db:seed
```

Never run that against a database with real reports in it. There is no
incremental mode; it truncates first.

#### Rotate the demo credentials before anyone real signs in

All 41 seeded accounts share the password **`jansetu-dev`**, which is written in
this repository and therefore public. Among them are
`admin@jansetu.local` (holds every permission), `user-district@jansetu.local`
(approves funding), `industry@jansetu.local`, `institute@jansetu.local`,
`student@jansetu.local`, five `off-0N@` delivery officers and sixteen `cit-*@`
citizens whose reports carry the verification standing.

Either seed and then rotate, or do not seed at all:

```sql
-- Locks every seeded account out without deleting the data they anchor.
UPDATE users SET "passwordHash" = '!' WHERE email LIKE '%@jansetu.local';
```

A hash that no bcrypt comparison can match disables sign-in while leaving the
reports, votes, ratings and leaderboard rows intact — deleting the users would
orphan all of it. Re-enable individual accounts through the normal
password-reset flow once that is wired (see *What is not wired yet*).

### Uploads

Evidence photographs and report attachments go through `/api/v1/uploads`. Two
drivers sit behind it and `STORAGE_DRIVER=auto` (the default) picks between
them: R2 when all four `R2_*` variables are present, local disk otherwise.

**In production the local driver is refused, with a 503, on purpose.** Railway's
filesystem is ephemeral — a redeploy or a restart discards it — so uploads
written to disk would disappear silently, taking the before-and-after gallery
that the public portal and the citizen verification flow both read with them.
Failing loudly beats losing evidence.

So: if you want uploads on the deployed API, create a Cloudflare R2 bucket
(free tier, no card) and set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_BASE_URL`. If you leave them
blank, everything else works and the two upload buttons return a 503 that the
UI surfaces as "attachments are not configured".

---

## 3. Web — Vercel

1. **Add New → Project**, import the repo.
2. Set **Root Directory** to `apps/web`. Vercel reads
   [`apps/web/vercel.json`](../apps/web/vercel.json) from there.
3. Environment variables:

   ```
   BACKEND_API_URL   https://your-backend.up.railway.app     (no trailing slash)
   GROQ_API_KEY      optional — only the AI Project Council uses it
   ```

4. Deploy, then note the assigned domain.

---

## 4. Close the loop — CORS

Go back to Railway and set:

```
CORS_ORIGINS=https://your-app.vercel.app
```

Then redeploy the API. Skipping this is the single most common failure: the site
loads, sign-in spins, and the browser console shows a CORS error rather than
anything about credentials.

---

## 5. CI and continuous deploy

Five workflows in [`.github/workflows/`](../.github/workflows):

| Workflow | Runs on | What it proves |
| --- | --- | --- |
| `backend-ci` | `backend/**` | lint, `tsc`, 91 unit tests, `migrate deploy` + seed + 162 e2e against a Postgres service, and that `openapi.json` is not stale |
| `web-ci` | `apps/web/**` | `tsc`, lint, and a production build against a placeholder `BACKEND_API_URL` — which is how it enforces that no page fetches at build time |
| `mobile-ci` | `apps/citizen-app/**` | `flutter analyze`, 74 widget tests, and a release web build |
| `deploy-api` | push to `main` | `railway up`, then polls `/readyz` until the database answers |
| `deploy-web` | push to `main` | `vercel build` here, `vercel deploy --prebuilt`, then checks the signed-out `/problems` page renders |

The two deploy workflows **skip themselves, green, when their secrets are
absent**. A clone with no hosting attached should not show a red X on every
push. Add these under *Settings → Secrets and variables → Actions* when you
have the accounts:

```
RAILWAY_TOKEN       Railway → project → Settings → Tokens (a project token)
RAILWAY_SERVICE     the service name — "backend" unless you renamed it
API_BASE_URL        https://your-backend.up.railway.app

VERCEL_TOKEN        Vercel → Account Settings → Tokens
VERCEL_ORG_ID       from apps/web/.vercel/project.json after one `vercel link`
VERCEL_PROJECT_ID   likewise
```

`BACKEND_API_URL` and `GROQ_API_KEY` are **not** in that list on purpose. They
live in the Vercel project's own environment and `vercel pull` fetches them at
build time; giving them a second home in GitHub secrets guarantees the two
drift apart.

Nothing orders the two deploys against each other — a push touching both runs
both at once. That is safe because the web app reads the API only per-request,
never during the build. The one release that needs care is a web change that
depends on a brand-new endpoint: dispatch `deploy-api` by hand first.

---

## Smoke test

Fifteen minutes, in this order. Steps 1–4 need no account at all, which is the
point: the public half of this product has to work for someone who arrived from
a WhatsApp link.

**Signed out**

1. `/problems` lists published problems with vote counts, and `/problems/<id>`
   opens one. This is the redaction boundary doing its job — every field on that
   page is named explicitly server-side, so anything sensitive appearing here is
   a bug, not a setting.
2. `/impact`, `/ledger` and `/leaderboard` render. `/ledger` is the funding
   audit trail; if it is empty the seed did not run.
3. `/robots.txt` and `/sitemap.xml` both return 200, and the sitemap lists the
   problem pages.
4. `/report` renders the intake form with no sign-in wall. File one — *"School
   ke paas wala chapakal sukha pada hai"* is a good test because it exercises
   the romanised-Hindi path in the keyword classifier. The confirmation should
   name a category (water), not "uncategorised". With no `GROQ_API_KEY` this is
   the deterministic keyword pass; that is a supported configuration, not a
   degraded one.

**Government**

5. `/signin` → `user-district@jansetu.local`. It must land on `/gov`, not back
   on `/signin`. If it loops, it is `CORS_ORIGINS` (step 4 above) nine times in
   ten.
6. `/gov/departments` shows 5 departments with officer names; `/gov/problems`
   shows the register with the Village and Department filters populated (8 and
   5 entries).
7. Open a problem → **Validate**. Reload. It holds. Then **Approve funding** on
   one that is ready, and reload again: the committed figure moves and
   `/ledger` gains a row. Every government mutation is server-backed now — if
   any of them reverts on reload, the proxy is dropping the request rather than
   the UI being optimistic.
8. `/gov/priority` shows the five weights summing to 100. Publishing a new set
   re-ranks `/gov/problems` on the next load.

**The other three surfaces**

9. Sign out, in as `institute@jansetu.local` → lands on `/institute`, and
   `/institute/students` lists the seeded roster.
10. `industry@jansetu.local` → `/industry`. `/industry/discover` shows challenge
    briefs built from real problems, with the village and reporter identities
    stripped. `/industry/csr` generates a report.
11. `student@jansetu.local` → `/dashboard`, and `/opportunities` is ranked by
    the recommender. With no `RECOMMENDER_URL` set this is the heuristic scorer
    — again, supported, not degraded.

**Verification, if R2 is configured**

12. As one of the `cit-*@jansetu.local` accounts (they hold the reporting
    standing), open `/report/verify`, attach a photograph and submit. Reload:
    the image renders in the gallery, and the same object appears on the public
    problem page. A 503 here means `STORAGE_DRIVER` fell back to local disk —
    see *Uploads* above.

---

## What is not wired yet

Say this out loud to anyone evaluating the deployment, because the screens do
not:

- **No message of any kind is ever delivered.** No OTP, no password reset, no
  email, no push. `backend/src/auth/otp.service.ts:52` and
  `auth.service.ts:159` both carry the TODO, and `FCM_SERVICE_ACCOUNT_JSON` is
  read but unused. Consequences: **citizen phone login cannot work**, a
  forgotten password has no recovery path short of a SQL update, and
  notifications are written to the database but only ever seen by someone who
  opens the notifications screen.
- **The sign-in page publishes the demo account list in production.**
  `apps/web/src/components/auth/demo-accounts.ts` is rendered unconditionally,
  and every account it names uses the password in this repository. Rotate them
  (see *Rotate the demo credentials* above) or remove that component before the
  URL goes anywhere.
- **Uploads need R2.** Without it the endpoints return 503 in production by
  design; evidence, attachments and the before-and-after gallery are the parts
  that go missing.
- **The Flutter citizen app does not talk to this backend.** It runs on
  in-memory repositories against a Firebase design that duplicates this API's
  clustering, ranking and verification logic. `mobile-ci` keeps it compiling and
  its 74 tests green; it is not part of this deployment. See the root README and
  COMPLETION_PLAN.md §7.
- **No error tracking, no alerting, no uptime check.** `/healthz` and `/readyz`
  are the only signals, and nothing watches them except `deploy-api` at the
  moment of deploy. A 3am 500 is invisible.
- **The recommender is heuristic unless you point it somewhere.**
  `RECOMMENDER_URL` switches student matching from the weighted scorer to an
  HTTP model; absent, the seam is real but nothing is behind it. It falls back
  rather than failing, so a wrong URL degrades silently.
- **The audit log is append-only but nothing reads it in the UI.** Every
  mutation writes an `audit_entries` row. There is no screen for it.

---

## Rollback

Railway keeps previous deployments — redeploy the last green one from the
service's Deployments tab. Note that this does **not** roll back a migration:
`migrate deploy` only moves forward. A migration that has to be undone needs a
new migration that undoes it, written and deployed like any other change. Take a
Neon branch before any deploy carrying a destructive migration; restoring that
branch is the only real undo.
