# ============================================
# Multi-stage Dockerfile for MpratamaStore
# Next.js 14 + Prisma + SQLite (Internal DB)
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client for SQLite (using local prisma, NOT npx)
RUN ./node_modules/.bin/prisma generate

# ============================================
# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Dummy DATABASE_URL for build time (SQLite file path, doesn't need actual connection)
ENV DATABASE_URL="file:/data/app.db"

# Skip database connection during build
ENV SKIP_ENV_VALIDATION=1

# Build the application
RUN npm run build

# ============================================
# Stage 3: Runner (Production)
# Using alpine3.18 for OpenSSL 1.1 compatibility with Prisma engines
FROM node:20-alpine3.18 AS runner
WORKDIR /app

# Install OpenSSL 1.1 for Prisma compatibility with SQLite
RUN apk add --no-cache openssl1.1-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create /data directory for SQLite database with proper permissions
RUN mkdir -p /data && chown nextjs:nodejs /data

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Ensure start script is executable
RUN chmod +x ./scripts/start.sh

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma client AND CLI (prisma CLI is in dependencies, needed for runtime migrate/generate)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create .bin directory and symlink for prisma CLI
RUN mkdir -p ./node_modules/.bin && \
    ln -sf ../prisma/build/index.js ./node_modules/.bin/prisma

# Ensure nextjs user can write to @prisma/engines (needed for generate)
RUN chown -R nextjs:nodejs ./node_modules/@prisma

# Copy dependencies needed for seed script
COPY --from=builder /app/node_modules/argon2 ./node_modules/argon2
COPY --from=builder /app/package.json ./package.json

# Copy tsx if available (for seed script)
RUN if [ -d /app/node_modules/tsx ]; then cp -r /app/node_modules/tsx ./node_modules/tsx; fi || true

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment defaults
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/data/app.db"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application using the startup script
CMD ["sh", "./scripts/start.sh"]
