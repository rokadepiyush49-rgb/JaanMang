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

# Apply any pending migrations, then start. `migrate deploy` is safe to run on
# every boot — it is a no-op when the schema is current.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
