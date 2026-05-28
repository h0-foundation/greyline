# syntax=docker/dockerfile:1.7
# Greyline — Next.js 16 standalone, non-root, healthchecked.
# Multi-stage so the runtime image carries only the bundle (no pnpm,
# no source, no devDependencies, no compiler toolchain).

# ────────────────────────────────────────────────────────────────────────
# 1) deps — production node_modules layer (cached on lockfile)
# ────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ────────────────────────────────────────────────────────────────────────
# 2) builder — compile the Next.js standalone bundle (+ native add-ons)
# ────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ────────────────────────────────────────────────────────────────────────
# 3) runner — minimal production image, non-root user
# ────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Non-root user (uid/gid 1001); /app/data is the user-data volume mount point.
RUN groupadd --gid 1001 greyline \
 && useradd --uid 1001 --gid greyline --create-home --shell /bin/bash greyline \
 && mkdir -p /app/data \
 && chown -R greyline:greyline /app

# Next standalone bundle. `output: "standalone"` (set in next.config.ts) packs
# server.js + the minimal node_modules subset; outputFileTracingIncludes pulls
# in the better-sqlite3 native binary and the SQL migration files at runtime.
COPY --from=builder --chown=greyline:greyline /app/.next/standalone ./
COPY --from=builder --chown=greyline:greyline /app/.next/static ./.next/static
COPY --from=builder --chown=greyline:greyline /app/public ./public

USER greyline

EXPOSE 3000

# Local /api/health is wired in the app; use it as the liveness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
