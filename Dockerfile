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

# Production — slim image without build tools
FROM node:20-slim
WORKDIR /app

# Only copy what's needed for runtime
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=base /app/apps/api/dist /app/apps/api/dist
COPY --from=base /app/apps/api/package.json /app/apps/api/package.json
COPY --from=base /app/packages /app/packages

RUN mkdir -p /app/apps/api/uploads

ENV NODE_ENV=production

WORKDIR /app/apps/api
CMD ["node", "--dns-result-order=ipv4first", "dist/main"]
