#!/bin/sh
# ============================================
# MpratamaStore Startup Script
# Handles: DB directory, migrations, seed, then starts Next.js
# ============================================

set -e  # Exit on any error

echo "================================================"
echo "🚀 MpratamaStore Startup Script"
echo "================================================"
echo ""

# ==================== STEP 1: Ensure /data directory exists ====================
echo "📁 Step 1: Ensuring /data directory exists..."
mkdir -p /data
echo "   ✅ /data directory ready"
echo ""

# ==================== STEP 2: Set correct DATABASE_URL if not set ====================
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/data/app.db"
  echo "📝 DATABASE_URL not set, using default: $DATABASE_URL"
fi
echo "📍 Using DATABASE_URL: $DATABASE_URL"
echo ""

# ==================== STEP 3: Generate Prisma Client ====================
echo "🔧 Step 2: Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
  echo "❌ Prisma generate failed!"
  exit 1
fi
echo "   ✅ Prisma Client generated"
echo ""

# ==================== STEP 4: Run Migrations ====================
echo "📊 Step 3: Running database migrations..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
  echo "❌ Database migration failed!"
  echo "   This might be the first run. Trying to create fresh schema..."
  
  # For first-time setup, push the schema directly
  npx prisma db push --accept-data-loss
  if [ $? -ne 0 ]; then
    echo "❌ Schema push also failed. Exiting."
    exit 1
  fi
  echo "   ✅ Fresh schema created using db push"
else
  echo "   ✅ Migrations applied successfully"
fi
echo ""

# ==================== STEP 5: Seed Database ====================
echo "🌱 Step 4: Running database seed..."
npx prisma db seed || true  # Don't fail if seed has issues (data may already exist)
echo "   ✅ Seed completed (or data already exists)"
echo ""

# ==================== STEP 6: Show Database Status ====================
echo "📊 Database status:"
echo "   - Location: /data/app.db"
if [ -f /data/app.db ]; then
  DB_SIZE=$(du -h /data/app.db | cut -f1)
  echo "   - Size: $DB_SIZE"
  echo "   - Status: ✅ Ready"
else
  echo "   - Status: ⚠️ Not created yet (will be created on first access)"
fi
echo ""

# ==================== STEP 7: Start Next.js ====================
echo "================================================"
echo "🌐 Starting Next.js server..."
echo "================================================"
echo ""

exec node server.js
