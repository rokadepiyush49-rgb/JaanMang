# syntax=docker/dockerfile:1

# ---- build ----------------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app

# System deps for argon2 (native) and prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime ------------------------------------------------------------------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 nodeapp

COPY --from=build --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --from=build --chown=nodeapp:nodeapp /app/dist ./dist
COPY --from=build --chown=nodeapp:nodeapp /app/prisma ./prisma
COPY --from=build --chown=nodeapp:nodeapp /app/package.json ./package.json

USER nodeapp
EXPOSE 4000

# Migrations are NOT run here. Every replica boots this same command, so a
# `migrate deploy` in CMD races itself the moment the service scales past one
# instance. The deploy pipeline runs it once, before the new version goes live —
# see `railway.json` (preDeployCommand) and `deploy/README.md`.
#
# The `prisma` CLI is a runtime dependency for exactly that pre-deploy step, so
# the migration runs from the image that is about to serve rather than pulling a
# floating version off npm at boot.
CMD ["node", "dist/main.js"]
