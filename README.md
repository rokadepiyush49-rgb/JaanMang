# Jan Setu

A societal innovation platform for Jharkhand. Citizens report local problems;
identical reports are folded into one demand carrying the weight of everyone who
raised it; government ranks demands on five published factors and funds down the
list; institutions put student teams on the work; industry sponsors it; and the
citizens who reported the problem decide whether it was actually fixed.

**Report → Cluster → Prioritise → Sponsor → Fund → Deliver → Citizen verify**

Four surfaces, one account model. Where you land after signing in is decided by
your account, never by the door you came through.

| Surface | Route | Who | State |
| --- | --- | --- | --- |
| Government workspace | `/gov` | Panchayat, block and district administration | **Live against the API** |
| Institute portal | `/institute` | Registrars, faculty, student teams | **Live against the API** |
| Student workspace | `/dashboard` | Students | Fixtures — labelled in the UI |
| Industry portal | `/industry` | CSR and partnership teams | Fixtures — labelled in the UI |
| Citizen app | `apps/citizen-app` | Citizens, in the field | Flutter, in-memory, not wired to this backend |

## Layout

```
backend/          NestJS + Prisma + Postgres — 77 endpoints, the source of truth
apps/web/         Next.js App Router — all four web surfaces
apps/citizen-app/ Flutter citizen app (see its own README; see also the note below)
docs/             DEPLOY.md, structure.md, CHATBOT_SETUP.md
DESIGN.md         The design system and the domain model behind it
COMPLETION_PLAN.md  The audited gap list between here and production
```

## Running it

You need Node 20 and a Postgres. The API and the web app are separate npm
projects; there is no workspace root yet.

```bash
cd backend && npm ci && cp .env.example .env
```

Point `DATABASE_URL` and `DIRECT_URL` at your database, then:

```bash
npx prisma migrate deploy && npm run db:seed && npm run start:dev
```

In another shell:

```bash
cd apps/web && npm ci && echo "BACKEND_API_URL=http://localhost:4000" > .env.local && npm run dev
```

The web app is on `:3000`, the API on `:4000`. Every seeded account uses the
password `jansetu-dev`; the sign-in page lists them, so you do not have to go
looking. `user-district@jansetu.local` is the one with the most to look at.

## Checks

```bash
cd backend && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e
```

```bash
cd apps/web && npx tsc --noEmit && npm run lint && npm run build
```

Both run in CI on every push (`.github/workflows/`). The backend job also fails
if `openapi.json` is stale, so regenerate it (`npm run openapi:gen`) whenever a
route changes.

## Deploying

Neon + Railway + Vercel, all free tier. Step by step, including the smoke test
and what is *not* wired yet: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## Design

[DESIGN.md](DESIGN.md) is the specification the surfaces are built from — the
colour and type systems, the shell, the accessibility rules, and the domain
design behind the priority engine, the visibility boundary and the AI Project
Council. Read §6 before changing anything about how problems are ranked or how
much of a challenge an industry partner is allowed to see.

## Security

No server credential ships in a client. The backend validates its whole
environment at boot and refuses to start on a missing secret; RBAC, jurisdiction
scoping and the surface guard are enforced server-side, and the web app's
layouts re-check every request rather than trusting the edge cookie. Report
issues per [SECURITY.md](SECURITY.md).

## A note on the citizen app

`apps/citizen-app/` is a complete Flutter client built against **Firebase** —
Firestore rules and four Cloud Functions that duplicate the ranking, clustering
and verification logic this backend already owns. It runs entirely on in-memory
repositories and has never talked to a server. It is kept because the UI is
finished and worth keeping; it is not part of this deployment. Reconciling the
two backends is the first decision in
[COMPLETION_PLAN.md](COMPLETION_PLAN.md) §7, and the recommendation there is to
keep NestJS and retire the Cloud Functions.
