import { NextResponse } from "next/server"
import { isDbEnabled, testDbConnection, getDbStatus, getPrismaClient } from "@/lib/db"
import { classifyDbError, DbErrorType } from "@/lib/db-errors"

// Force dynamic - health check should always be fresh
export const dynamic = 'force-dynamic'

/**
 * Enhanced Health Check Endpoint
 * 
 * Returns detailed status about:
 * - db.connected: Can we connect to the database?
 * - db.schemaReady: Are the tables created (migration applied)?
 * - db.seeded: Is there basic data (at least 1 admin user)?
 * - db.errorType: Classified error type if any
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  const dbStatus = getDbStatus()
  
  const response: {
    ok: boolean
    app: string
    timestamp: string
    version: string
    db: {
      enabled: boolean
      connected: boolean
      schemaReady: boolean
      seeded: boolean
      provider: string
      latencyMs?: number
      error?: string
      errorType?: DbErrorType
      config: {
        skipFlag: boolean
        urlConfigured: boolean
      }
    }
  } = {
    ok: true,
    app: "up",
    timestamp,
    version: process.env.npm_package_version || "1.0.0",
    db: {
      enabled: dbStatus.enabled,
      connected: false,
      schemaReady: false,
      seeded: false,
      provider: dbStatus.provider,
      config: {
        skipFlag: dbStatus.skipFlag,
        urlConfigured: dbStatus.urlConfigured,
      }
    }
  }
  
  // Only test DB if enabled
  if (!dbStatus.enabled) {
    response.db.error = "Database disabled or not configured"
    response.db.errorType = 'CONNECTION'
    return NextResponse.json(response, { status: 200 })
  }
  
  // Test basic connection
  try {
    const connectionTest = await testDbConnection(3000) // 3s timeout
    response.db.connected = connectionTest.connected
    response.db.latencyMs = connectionTest.latencyMs
    
    if (!connectionTest.connected) {
      const errorInfo = classifyDbError(connectionTest.error)
      response.db.error = sanitizeError(connectionTest.error || 'Connection failed')
      response.db.errorType = errorInfo.type
      return NextResponse.json(response, { status: 200 })
    }
  } catch (error) {
    const errorInfo = classifyDbError(error)
    response.db.connected = false
    response.db.error = error instanceof Error ? sanitizeError(error.message) : "Unknown error"
    response.db.errorType = errorInfo.type
    return NextResponse.json(response, { status: 200 })
  }
  
  // Connection successful - now check schema
  const client = getPrismaClient()
  if (client) {
    // Check if key tables exist
    const schemaCheck = await checkSchemaReady(client)
    response.db.schemaReady = schemaCheck.ready
    if (schemaCheck.error) {
      const errorInfo = classifyDbError(schemaCheck.error)
      response.db.errorType = errorInfo.type
      // Don't override connected status - schema missing is different from connection failure
    }
    
    // If schema ready, check if seeded
    if (schemaCheck.ready) {
      const seedCheck = await checkSeeded(client)
      response.db.seeded = seedCheck.seeded
    }
  }
  
  console.log(`[Health] Check: connected=${response.db.connected}, schemaReady=${response.db.schemaReady}, seeded=${response.db.seeded}`)
  
  return NextResponse.json(response, { status: 200 })
}

/**
 * Check if required tables exist in the database
 */
async function checkSchemaReady(client: ReturnType<typeof getPrismaClient>): Promise<{
  ready: boolean
  error?: string
}> {
  if (!client) return { ready: false, error: 'No client' }
  
  try {
    // Try to query a core table - User is usually the first table
    // Using count which is lightweight
    await client.user.count({ take: 1 })
    
    // Also check Product table
    await client.product.count({ take: 1 })
    
    return { ready: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    
    // Check for "no such table" which means migration not run
    if (message.includes('no such table') || 
        message.includes('P2021') || 
        message.includes('does not exist')) {
      return { ready: false, error: message }
    }
    
    // Other errors - schema might be ready but query failed for other reason
    // Be conservative and mark as not ready
    return { ready: false, error: message }
  }
}

/**
 * Check if database has been seeded (at least one admin user exists)
 */
async function checkSeeded(client: ReturnType<typeof getPrismaClient>): Promise<{
  seeded: boolean
}> {
  if (!client) return { seeded: false }
  
  try {
    // Check for at least one admin user
    const adminCount = await client.user.count({
      where: { role: 'ADMIN' }
    })
    
    return { seeded: adminCount > 0 }
  } catch {
    // If query fails, assume not seeded
    return { seeded: false }
  }
}

/**
 * Sanitize error messages to avoid exposing internal file paths
 */
function sanitizeError(error: string): string {
  let sanitized = error.replace(/\/[a-zA-Z0-9_\-./]+\.db/g, '[database file]')
  sanitized = sanitized.replace(/\/data\/[a-zA-Z0-9_\-./]+/g, '[data path]')
  sanitized = sanitized.replace(/file:[a-zA-Z0-9_\-./]+/g, 'file:[path]')
  sanitized = sanitized.replace(/\/app\/[a-zA-Z0-9_\-./]+/g, '[app path]')
  
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...'
  }
  
  return sanitized
}
