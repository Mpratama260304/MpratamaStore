#!/usr/bin/env node
/**
 * MpratamaStore Bootstrap Script
 * 
 * This script ensures the admin user exists before the Next.js server starts.
 * It is idempotent - safe to run multiple times.
 * 
 * Features:
 * - Checks for /data/.seeded marker file to skip unnecessary work
 * - Creates admin user with hashed password using argon2
 * - Creates marker file after successful bootstrap
 * - Works with environment variables from docker-compose
 * 
 * Environment variables:
 * - DATABASE_URL: SQLite database path (file:/data/app.db)
 * - ADMIN_EMAIL: Admin user email
 * - ADMIN_USERNAME: Admin username  
 * - ADMIN_PASSWORD: Admin password (will be hashed)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Constants
const MARKER_FILE = '/data/.seeded';
const DATA_DIR = '/data';

// Role constants
const Role = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
};

/**
 * Check if marker file exists (indicates bootstrap was already done)
 */
function isMarkerPresent() {
  try {
    return fs.existsSync(MARKER_FILE);
  } catch {
    return false;
  }
}

/**
 * Create marker file to indicate successful bootstrap
 */
function createMarker() {
  try {
    // Ensure /data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const content = JSON.stringify({
      seededAt: new Date().toISOString(),
      adminEmail: process.env.ADMIN_EMAIL || 'unknown',
      version: '1.0.0'
    }, null, 2);
    
    fs.writeFileSync(MARKER_FILE, content, 'utf8');
    console.log('   ✅ Marker file created:', MARKER_FILE);
    return true;
  } catch (error) {
    console.error('   ⚠️ Failed to create marker file:', error.message);
    return false;
  }
}

/**
 * Hash password using argon2
 */
async function hashPassword(password) {
  try {
    const argon2 = require('argon2');
    return await argon2.hash(password);
  } catch (error) {
    console.error('   ❌ Failed to hash password with argon2:', error.message);
    throw error;
  }
}

/**
 * Check if admin user exists
 */
async function adminExists(prisma, email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true }
    });
    return user;
  } catch (error) {
    // Table might not exist yet
    if (error.message.includes('no such table') || 
        error.message.includes('does not exist') ||
        error.code === 'P2021' ||
        error.code === 'P2010') {
      console.log('   ⚠️ User table does not exist yet - schema may need migration');
      return null;
    }
    throw error;
  }
}

/**
 * Create admin user
 */
async function createAdminUser(prisma, email, username, password) {
  console.log('   📝 Creating admin user...');
  
  try {
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: new Date(),
        isActive: true,
      }
    });
    
    console.log(`   ✅ Admin user created: ${email} (ID: ${user.id})`);
    return user;
  } catch (error) {
    // Handle table not existing (schema not migrated)
    if (error.message.includes('no such table') || 
        error.message.includes('does not exist') ||
        error.code === 'P2021' ||
        error.code === 'P2010') {
      console.log('   ⚠️ Cannot create admin - User table does not exist');
      console.log('   💡 Run migrations first: prisma migrate deploy or prisma db push');
      throw new Error('Schema not ready - migrations required');
    }
    
    // Handle unique constraint (user already exists with different case email)
    if (error.code === 'P2002') {
      console.log(`   ⚠️ User with email ${email} or username ${username} already exists`);
      return null;
    }
    
    throw error;
  }
}

/**
 * Update existing user to admin role if needed
 */
async function ensureAdminRole(prisma, existingUser, email) {
  if (existingUser.role !== Role.ADMIN) {
    await prisma.user.update({
      where: { email },
      data: { role: Role.ADMIN }
    });
    console.log(`   ✅ Updated user role to ADMIN: ${email}`);
    return true;
  }
  console.log(`   ℹ️ Admin user already exists: ${email}`);
  return false;
}

/**
 * Ensure required site settings exist
 */
async function ensureSiteSettings(prisma) {
  try {
    await prisma.siteSetting.upsert({
      where: { id: 'site-settings' },
      update: {},
      create: {
        id: 'site-settings',
        siteTitle: 'MpratamaStore',
        siteTagline: 'Fantasy Digital Market — Claim Your Rewards',
        siteDescription: 'Toko produk digital bertema fantasy',
        maintenanceMode: false,
        storeNotice: '🎮 Welcome to the Fantasy Market!',
      }
    });
    console.log('   ✅ Site settings ready');
  } catch (error) {
    console.log('   ⚠️ Site settings skip:', error.message);
  }
}

/**
 * Ensure required SEO settings exist
 */
async function ensureSeoSettings(prisma) {
  try {
    await prisma.seoSetting.upsert({
      where: { id: 'seo-settings' },
      update: {},
      create: {
        id: 'seo-settings',
        defaultMetaTitle: 'MpratamaStore - Fantasy Digital Market',
        defaultMetaDescription: 'Toko produk digital bertema fantasy',
        robotsIndex: true,
        robotsFollow: true,
        generateSitemap: true,
      }
    });
    console.log('   ✅ SEO settings ready');
  } catch (error) {
    console.log('   ⚠️ SEO settings skip:', error.message);
  }
}

/**
 * Ensure required payment settings exist
 */
async function ensurePaymentSettings(prisma) {
  try {
    const manualAccounts = JSON.stringify([
      { bank: 'BCA', accountNumber: '1234567890', accountName: 'MpratamaStore' },
      { bank: 'DANA', accountNumber: '08123456789', accountName: 'MpratamaStore' },
    ]);

    await prisma.paymentSetting.upsert({
      where: { id: 'payment-settings' },
      update: {},
      create: {
        id: 'payment-settings',
        mode: 'BOTH',
        manualAccounts: manualAccounts,
        manualInstructions: 'Transfer sesuai total pesanan.',
      }
    });
    console.log('   ✅ Payment settings ready');
  } catch (error) {
    console.log('   ⚠️ Payment settings skip:', error.message);
  }
}

/**
 * Main bootstrap function
 */
async function ensureAdminUser() {
  console.log('');
  console.log('🔐 Bootstrap: Ensuring admin user exists...');
  
  // Get environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  // Validate required environment variables
  if (!adminEmail || !adminUsername || !adminPassword) {
    console.log('   ⚠️ ADMIN_EMAIL, ADMIN_USERNAME, or ADMIN_PASSWORD not set');
    console.log('   ⚠️ Skipping admin user creation');
    console.log('   💡 Set these environment variables to auto-create admin user');
    return { success: false, reason: 'missing_env' };
  }
  
  console.log(`   📧 Admin email: ${adminEmail}`);
  console.log(`   👤 Admin username: ${adminUsername}`);
  
  // Check marker file first (quick check)
  if (isMarkerPresent()) {
    console.log('   ✅ Marker file found - bootstrap already completed');
    return { success: true, reason: 'marker_exists' };
  }
  
  // Initialize Prisma client
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  try {
    // Test connection
    console.log('   🔌 Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Database connected');
    
    // Check if admin user exists
    const existingAdmin = await adminExists(prisma, adminEmail);
    
    if (existingAdmin) {
      // User exists - ensure they have admin role
      await ensureAdminRole(prisma, existingAdmin, adminEmail);
    } else {
      // Create new admin user - this may fail if schema is not ready
      const newUser = await createAdminUser(prisma, adminEmail, adminUsername, adminPassword);
      if (!newUser) {
        // User creation returned null (likely duplicate key), don't fail
        console.log('   ℹ️ Admin user may already exist with different case');
      }
    }
    
    // Ensure essential settings exist
    console.log('   📋 Ensuring essential settings...');
    await ensureSiteSettings(prisma);
    await ensureSeoSettings(prisma);
    await ensurePaymentSettings(prisma);
    
    // Create marker file to indicate successful bootstrap
    createMarker();
    
    console.log('   ✅ Bootstrap completed successfully!');
    return { success: true, reason: 'completed' };
    
  } catch (error) {
    console.error('   ❌ Bootstrap error:', error.message);
    
    // Check if this is a schema-not-ready error
    if (error.message.includes('Schema not ready') ||
        error.message.includes('no such table') ||
        error.message.includes('does not exist')) {
      console.log('   💡 Schema not ready - bootstrap will retry on next startup');
      console.log('   💡 Ensure migrations have been applied: prisma migrate deploy');
      return { success: false, reason: 'schema_not_ready', error: error.message };
    }
    
    // Log more details in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('   Stack:', error.stack);
    }
    
    return { success: false, reason: 'error', error: error.message };
    
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('================================================');
  console.log('🔧 MpratamaStore Bootstrap');
  console.log('================================================');
  console.log('');
  console.log('📍 DATABASE_URL:', process.env.DATABASE_URL || '(not set)');
  console.log('📍 ADMIN_EMAIL:', process.env.ADMIN_EMAIL || '(not set)');
  
  try {
    const result = await ensureAdminUser();
    
    if (result.success) {
      console.log('');
      console.log('✅ Bootstrap: SUCCESS');
      process.exit(0);
    } else {
      console.log('');
      console.log('⚠️ Bootstrap: SKIPPED or FAILED');
      console.log('   Reason:', result.reason);
      
      // Don't fail the process for these cases - server can still start
      // Missing env vars: admin just won't be created automatically
      // Schema not ready: migrations haven't run yet, but server can still start
      if (result.reason === 'missing_env' || result.reason === 'schema_not_ready') {
        console.log('   ℹ️ Server will continue starting...');
        process.exit(0);
      }
      
      // Exit with error for actual unexpected errors
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('❌ Bootstrap: FATAL ERROR');
    console.error(error);
    // Even on fatal error, let server try to start (it may still be usable)
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other scripts
module.exports = { ensureAdminUser, isMarkerPresent, MARKER_FILE };
