/**
 * Database Helper - Safe Prisma Wrapper for SQLite
 * 
 * Provides safe database operations that won't crash the app
 * when database is unreachable or not yet created.
 * 
 * For SQLite, the database file is created automatically on first access.
 */

import { PrismaClient } from '@prisma/client'

// Global singleton for PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbConnectionTested: boolean
  dbConnectionResult: boolean
}

/**
 * Check if database is explicitly disabled via environment
 */
export function isDbSkipped(): boolean {
  const skipDb = process.env.SKIP_DB || process.env.DEPLOY_NO_DB
  return skipDb === 'true' || skipDb === '1'
}

/**
 * Check if DATABASE_URL is configured
 */
export function isDatabaseUrlConfigured(): boolean {
  const dbUrl = process.env.DATABASE_URL || ''
  return dbUrl.trim() !== '' && dbUrl.startsWith('file:')
}

/**
 * Check if database operations should be enabled
 */
export function isDbEnabled(): boolean {
  if (isDbSkipped()) {
    console.log('[DB] Database disabled via SKIP_DB flag')
    return false
  }
  
  if (!isDatabaseUrlConfigured()) {
    console.log('[DB] Database disabled - DATABASE_URL not configured for SQLite')
    return false
  }
  
  return true
}

/**
 * Get Prisma client instance (singleton)
 * Returns null if database is disabled
 */
export function getPrismaClient(): PrismaClient | null {
  if (!isDbEnabled()) {
    return null
  }
  
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
  
  return globalForPrisma.prisma
}

/**
 * Safe prisma getter - returns null if db disabled
 */
export function safePrisma(): PrismaClient | null {
  return getPrismaClient()
}

/**
 * Test database connection with timeout
 * For SQLite, this checks if we can query the database
 */
export async function testDbConnection(timeoutMs: number = 5000): Promise<{
  connected: boolean
  error?: string
  latencyMs?: number
}> {
  if (!isDbEnabled()) {
    return { connected: false, error: 'Database disabled' }
  }
  
  const client = getPrismaClient()
  if (!client) {
    return { connected: false, error: 'Prisma client not available' }
  }
  
  const startTime = Date.now()
  
  try {
    // For SQLite, use a simple query that works without any tables
    const result = await Promise.race([
      client.$queryRaw`SELECT 1 as health`,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
      )
    ])
    
    const latencyMs = Date.now() - startTime
    console.log(`[DB] SQLite connection test successful (${latencyMs}ms)`)
    
    return { connected: true, latencyMs }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[DB] SQLite connection test failed (${latencyMs}ms):`, errorMessage)
    
    return { connected: false, error: errorMessage, latencyMs }
  }
}

/**
 * Execute a database operation safely with fallback
 * If database is disabled or query fails, returns the fallback value
 * 
 * @param operation - Async function that performs the database operation
 * @param fallback - Value to return if operation fails
 * @param operationName - Name for logging purposes
 */
export async function withDb<T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  fallback: T,
  operationName: string = 'database operation'
): Promise<{ data: T; fromDb: boolean; error?: string }> {
  if (!isDbEnabled()) {
    console.log(`[DB] Skipping ${operationName} - database disabled`)
    return { data: fallback, fromDb: false, error: 'Database disabled' }
  }
  
  const client = getPrismaClient()
  if (!client) {
    console.log(`[DB] Skipping ${operationName} - no prisma client`)
    return { data: fallback, fromDb: false, error: 'No database client' }
  }
  
  try {
    const result = await operation(client)
    return { data: result, fromDb: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[DB] Error in ${operationName}:`, errorMessage)
    return { data: fallback, fromDb: false, error: errorMessage }
  }
}

/**
 * Get database status for health checks and debugging
 */
export function getDbStatus(): {
  enabled: boolean
  skipFlag: boolean
  urlConfigured: boolean
  provider: string
} {
  return {
    enabled: isDbEnabled(),
    skipFlag: isDbSkipped(),
    urlConfigured: isDatabaseUrlConfigured(),
    provider: 'sqlite',
  }
}

// Prevent multiple prisma clients in development
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
  // Reuse existing client
}
