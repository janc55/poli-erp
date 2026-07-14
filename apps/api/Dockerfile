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
COPY apps/api ./apps/api

# Provide dummy .env so Prisma generate and nest build don't fail
RUN printf '\
DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy\n\
JWT_SECRET=dummy\n\
JWT_EXPIRES_IN=15m\n\
JWT_REFRESH_SECRET=dummy\n\
JWT_REFRESH_EXPIRES_IN=7d\n\
API_PORT=3000\n\
API_URL=http://localhost:3000\n\
CORS_ORIGIN=http://localhost:3000\n' > .env

# Generate Prisma client
RUN pnpm --filter @poli-erp/database exec prisma generate

# Build shared packages
RUN pnpm --filter @poli-erp/database run build
RUN pnpm --filter @poli-erp/shared run build

# Build the API
RUN pnpm --filter @poli-erp/api run build

# Clean up dummy .env
RUN rm -f .env

# Prune dev dependencies for a leaner production image
RUN pnpm prune --prod --no-optional

# ── Stage 4: Runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy pruned node_modules and built artifacts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy built packages
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/database/package.json ./packages/database/package.json
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=build /app/packages/database/prisma ./packages/database/prisma

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json

# Copy built API
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

# Copy entrypoint script
COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

# Use non-root user for security
USER node

EXPOSE 3000

ENTRYPOINT ["./apps/api/entrypoint.sh"]
