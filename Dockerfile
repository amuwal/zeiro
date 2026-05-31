# Cloud Run image for the Zeiro agents service (apps/agents — Mastra agent loop
# on Hono). Build context is the whole monorepo: apps/agents depends on
# packages/* via the pnpm workspace, so a single-package context can't resolve
# `workspace:*` deps. Mirrors the (working) Render build: corepack + pnpm install
# (which runs @zeiro/db's postinstall `prisma generate`) then tsx the server.
FROM node:22-slim

# TLS roots for Neon / model-provider HTTPS. Prisma 7 + @prisma/adapter-neon use
# the Neon serverless driver, so no native query-engine / openssl is required.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
# Cloud Run injects PORT (defaults to 8080); src/server.ts reads process.env.PORT.
ENV PORT=8080
EXPOSE 8080

CMD ["pnpm", "--filter", "@zeiro/agents", "exec", "tsx", "src/server.ts"]
