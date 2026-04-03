FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files for dependency resolution
COPY apps/api/package.json apps/api/
COPY packages/db-schema/package.json packages/db-schema/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/utils/package.json packages/utils/
COPY packages/channel-sdk/package.json packages/channel-sdk/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY packages/ packages/
COPY apps/api/ apps/api/

# Build
RUN pnpm --filter @chatbox/api build

# Production stage
FROM node:20-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/src/database ./apps/api/src/database

# Create uploads directory
RUN mkdir -p /app/apps/api/uploads

ENV NODE_ENV=production
ENV API_PORT=3001

EXPOSE 3001

WORKDIR /app/apps/api
CMD ["node", "dist/main"]
