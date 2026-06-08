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
# Stage 2: builder — Next.js production build
# ============================================================
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for public env vars (baked in at build time by Next.js)
ARG NEXT_PUBLIC_VIBE_APP_ID
ARG NEXT_PUBLIC_VIBE_PUBLIC_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_BUCKET_URL

ENV NEXT_PUBLIC_VIBE_APP_ID=${NEXT_PUBLIC_VIBE_APP_ID}
ENV NEXT_PUBLIC_VIBE_PUBLIC_KEY=${NEXT_PUBLIC_VIBE_PUBLIC_KEY}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_BUCKET_URL=${NEXT_PUBLIC_BUCKET_URL}

RUN npm run --prefix apps/chat-web build

# ============================================================
# Stage 3: runner — standalone Next.js server
# ============================================================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Next.js standalone output includes its own minimal node_modules
COPY --from=builder /app/apps/chat-web/.next/standalone ./
COPY --from=builder /app/apps/chat-web/.next/static ./apps/chat-web/.next/static
COPY --from=builder /app/apps/chat-web/public ./apps/chat-web/public

EXPOSE 3000

CMD ["node", "apps/chat-web/server.js"]
