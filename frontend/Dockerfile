# ==============================================================================
# VaaniReach Frontend Dockerfile
# Next.js 16 + React 19 + Tailwind CSS (Multi-stage Standalone Build)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Install dependencies (deps)
# Only re-runs if package.json or package-lock.json changes
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Build the Next.js application (builder)
# Inlines NEXT_PUBLIC_API_URL into client bundles and creates .next/standalone
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=https://vaani-backend-2026.onrender.com
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production runtime image (runner)
# Minimal lightweight Alpine container running node server.js directly
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: run as non-privileged system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build and static public assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
