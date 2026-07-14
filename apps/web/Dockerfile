# ── Stage 1: Base ────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ── Stage 2: Dependencies ───────────────────────────────────
FROM base AS deps

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json turbo.json ./

# Copy all package.json files to leverage Docker layer caching
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# ── Stage 3: Build ──────────────────────────────────────────
FROM deps AS build

# Copy source code
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build-time args for Next.js public env vars (baked into the bundle)
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Provide dummy .env for build process
RUN printf '\
DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy\n\
NEXT_PUBLIC_API_URL=%s\n\
NEXTAUTH_URL=http://localhost:3000\n\
NEXTAUTH_SECRET=dummy-build-secret\n' "${NEXT_PUBLIC_API_URL}" > .env

# Generate Prisma client (needed if web imports from database package)
RUN pnpm --filter @poli-erp/database exec prisma generate

# Build shared packages
RUN pnpm --filter @poli-erp/database run build
RUN pnpm --filter @poli-erp/shared run build

# Build Next.js (produces .next/standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @poli-erp/web run build

# Clean up dummy .env
RUN rm -f .env

# ── Stage 4: Runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes server.js + minimal node_modules)
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static assets (not included in standalone output)
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy public folder if it exists (uncomment if you add a public dir later)
# COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# Standalone server.js is at the monorepo root level
CMD ["node", "apps/web/server.js"]
