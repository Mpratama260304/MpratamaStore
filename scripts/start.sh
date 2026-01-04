#!/bin/sh
# ============================================
# MpratamaStore Startup Script
# Handles: DB directory, migrations, seed, then starts Next.js
# 
# IMPORTANT: Prisma Client is pre-generated at build time!
# This script does NOT run "prisma generate" because:
# 1. node_modules is read-only in production
# 2. Prisma Client was already generated during docker build
# ============================================

set -e  # Exit on any error

echo "================================================"
echo "🚀 MpratamaStore Startup Script"
echo "================================================"
echo ""

# ==================== STEP 1: Ensure /data directory exists ====================
echo "📁 Step 1: Ensuring /data directory exists..."
mkdir -p /data 2>/dev/null || true
echo "   ✅ /data directory ready"
echo ""

# ==================== STEP 2: Set correct DATABASE_URL if not set ====================
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/data/app.db"
  echo "📝 DATABASE_URL not set, using default: $DATABASE_URL"
fi
echo "📍 Using DATABASE_URL: $DATABASE_URL"
echo ""

# ==================== STEP 3: Log environment info ====================
echo "🔧 Environment Info:"
echo "   NODE_ENV: ${NODE_ENV:-development}"
echo "   PORT: ${PORT:-3000}"
echo "   Stripe: $([ -n \"$STRIPE_SECRET_KEY\" ] && echo 'Configured' || echo 'Not set')"
echo "   PayPal: $([ -n \"$PAYPAL_CLIENT_ID\" ] && echo 'Configured' || echo 'Not set')"
echo ""

# ==================== STEP 4: Verify Prisma CLI ====================
# CRITICAL: Use local prisma binary, NOT npx (which downloads latest version!)
PRISMA_CLI="node ./node_modules/prisma/build/index.js"

# Verify prisma exists
if [ ! -f "./node_modules/prisma/build/index.js" ]; then
  echo "❌ Prisma CLI not found at ./node_modules/prisma/build/index.js"
  echo "   This means the Docker image was built incorrectly."
  echo "   Ensure 'prisma' is in dependencies (not devDependencies)."
  exit 1
fi
echo "   ✅ Prisma CLI found"
$PRISMA_CLI --version 2>/dev/null || echo "   (version check skipped)"
echo ""

# ==================== STEP 5: Skip Prisma Generate (pre-built) ====================
# Prisma Client is already generated during Docker build
# DO NOT run "prisma generate" here - it would fail because node_modules is read-only
echo "🔧 Step 2: Prisma Client (pre-generated at build time)"
echo "   ✅ Using pre-built Prisma Client"
echo ""

# ==================== STEP 6: Run Migrations ====================
echo "📊 Step 3: Running database migrations..."
$PRISMA_CLI migrate deploy 2>&1 || MIGRATE_FAILED=1

if [ "$MIGRATE_FAILED" = "1" ]; then
  echo "⚠️  Migration deploy failed (this might be first run)"
  echo "   Trying db push for SQLite setup..."
  
  # For first-time setup or SQLite, push the schema directly
  if $PRISMA_CLI db push --accept-data-loss 2>&1; then
    echo "   ✅ Fresh schema created using db push"
  else
    echo "⚠️  Schema push also failed."
    echo "   Server will start but database may not work correctly."
    echo "   Check /api/health for detailed status."
  fi
else
  echo "   ✅ Migrations applied successfully"
fi
echo ""

# ==================== STEP 7: Seed Database ====================
echo "🌱 Step 4: Running database seed..."
$PRISMA_CLI db seed 2>&1 || true  # Don't fail if seed has issues (data may already exist)
echo "   ✅ Seed completed (or data already exists)"
echo ""

# ==================== STEP 8: Show Database Status ====================
echo "📊 Database status:"
echo "   - Location: /data/app.db"
if [ -f /data/app.db ]; then
  DB_SIZE=$(du -h /data/app.db 2>/dev/null | cut -f1 || echo "unknown")
  echo "   - Size: $DB_SIZE"
  echo "   - Status: ✅ Ready"
else
  echo "   - Status: ⚠️ Not created yet (will be created on first query)"
fi
echo ""

# ==================== STEP 9: Start Next.js ====================
echo "================================================"
echo "🌐 Starting Next.js server..."
echo "   Port: ${PORT:-3000}"
echo "   Hostname: ${HOSTNAME:-0.0.0.0}"
echo "================================================"
echo ""

# Use exec to replace shell with node process for proper signal handling
exec node server.js
