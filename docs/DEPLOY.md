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

1. New project → **Deploy from GitHub repo** → pick this repo.
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

The seed is written for demonstration: it creates the Ranchi jurisdictions,
five departments, five officers, twelve problems, ninety-six citizen reports,
the BIT Mesra institute and the demo accounts. It is what makes a fresh deploy
show a working product instead of empty tables.

Run it once, from the Railway service shell:

```bash
npm run db:seed
```

Every demo account uses the password `jansetu-dev`. **Change or disable them
before this is in front of real users** — `student@jansetu.local`,
`user-district@jansetu.local`, `industry@jansetu.local`,
`institute@jansetu.local` and `admin@jansetu.local` are published in this repo.

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

## Smoke test

In order, on the deployed site:

1. `/signin` renders and lists the demo accounts.
2. Signing in as `user-district@jansetu.local` lands on `/gov`, not `/signin`.
3. `/gov/departments` shows five departments with officer names — this is the
   proof the reference endpoints are wired, because that screen has no fixtures
   behind it any more.
4. `/gov/problems` shows the register, and the Village and Department filters are
   populated (8 and 5 entries).
5. Opening a problem and pressing **Validate** persists — reload and it holds.
6. Signing out and back in as `institute@jansetu.local` lands on `/institute`.
7. `/industry` and `/dashboard` both show the amber **Demonstration data**
   banner. They are meant to.

---

## What is not wired yet

Say this out loud to anyone evaluating the deployment, because the screens do
not:

- **The industry portal and the student surface run on fixtures.** Both carry a
  banner. No mutation on either is written anywhere.
- **Fifteen government mutations are client-side only** — sponsorship, funding,
  officer assignment, project progress, verification, automation toggles. They
  survive navigation and are lost on reload. Validate, reject, route and publish
  weights are the four that persist.
- **No OTP or password-reset message is ever delivered.**
  `backend/src/auth/otp.service.ts` and `auth.service.ts` both carry the TODO.
  Citizen phone login cannot work in production until a provider is wired.
- **No file upload.** The R2 variables are read but no endpoint uses them.
- **No error tracking or alerting.** `/healthz` is the only signal.

---

## Rollback

Railway keeps previous deployments — redeploy the last green one from the
service's Deployments tab. Note that this does **not** roll back a migration:
`migrate deploy` only moves forward. A migration that has to be undone needs a
new migration that undoes it, written and deployed like any other change. Take a
Neon branch before any deploy carrying a destructive migration; restoring that
branch is the only real undo.
