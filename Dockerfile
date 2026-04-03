FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Copy everything needed for install + build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db-schema/package.json packages/db-schema/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/utils/package.json packages/utils/
COPY packages/channel-sdk/package.json packages/channel-sdk/

# Install all dependencies (not frozen - workspace may differ)
RUN pnpm install --no-frozen-lockfile

# Copy all source
COPY packages/ packages/
COPY apps/api/ apps/api/

# Build the API
WORKDIR /app/apps/api
RUN pnpm run build

# Production
FROM node:20-slim
WORKDIR /app

COPY --from=base /app/ /app/

RUN mkdir -p /app/apps/api/uploads

ENV NODE_ENV=production

WORKDIR /app/apps/api
CMD ["node", "dist/main"]
