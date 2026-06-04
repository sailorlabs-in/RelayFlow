# ============================================================
# Stage 1: deps — install from root workspace lock file
# ============================================================
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./

# npm ci requires ALL workspace member package.json files to be present
# because root package.json declares workspaces: ["apps/*", "libs/*"]
COPY apps/chat-web/package.json       ./apps/chat-web/package.json
COPY apps/gateway/package.json        ./apps/gateway/package.json
COPY apps/worker-service/package.json ./apps/worker-service/package.json
COPY libs/common/package.json         ./libs/common/package.json
COPY libs/config/package.json         ./libs/config/package.json
COPY libs/contracts/package.json      ./libs/contracts/package.json
COPY libs/database/package.json       ./libs/database/package.json
COPY libs/logger/package.json         ./libs/logger/package.json
COPY libs/queues/package.json         ./libs/queues/package.json
COPY libs/redis/package.json          ./libs/redis/package.json
COPY libs/shared-constants/package.json ./libs/shared-constants/package.json
COPY libs/shared-events/package.json  ./libs/shared-events/package.json
COPY libs/validation/package.json     ./libs/validation/package.json

RUN npm ci --ignore-scripts

# ============================================================
# Stage 2: builder
# ============================================================
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx nx build worker-service --configuration=production --skip-sync

# ============================================================
# Stage 3: runner
# ============================================================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/worker-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs

CMD ["node", "dist/main.js"]
