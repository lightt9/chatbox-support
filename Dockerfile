FROM node:20-slim AS base
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
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

# Copy all source (bust cache on code changes)
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN echo "build_bust=$(date +%s)" > /tmp/.build_time

# Build the API
WORKDIR /app/apps/api
RUN pnpm run build

# Production
FROM node:20-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=base /app/ /app/

RUN mkdir -p /app/apps/api/uploads

ENV NODE_ENV=production

WORKDIR /app/apps/api
CMD ["node", "dist/main"]
