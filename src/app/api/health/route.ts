import { NextResponse } from "next/server"
import { isDbEnabled, testDbConnection, getDbStatus } from "@/lib/db"

// Force dynamic - health check should always be fresh
export const dynamic = 'force-dynamic'

export async function GET() {
  const timestamp = new Date().toISOString()
  const dbStatus = getDbStatus()
  
  // App is always "up" if this endpoint responds
  const response: {
    ok: boolean
    app: string
    timestamp: string
    version: string
    db: {
      enabled: boolean
      connected: boolean
      provider: string
      latencyMs?: number
      error?: string
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
      provider: dbStatus.provider,
      config: {
        skipFlag: dbStatus.skipFlag,
        urlConfigured: dbStatus.urlConfigured,
      }
    }
  }
  
  // Only test DB connection if enabled
  if (dbStatus.enabled) {
    try {
      const connectionTest = await testDbConnection(3000) // 3s timeout
      response.db.connected = connectionTest.connected
      response.db.latencyMs = connectionTest.latencyMs
      if (connectionTest.error) {
        // Sanitize error to not expose internal paths
        response.db.error = sanitizeError(connectionTest.error)
      }
    } catch (error) {
      response.db.connected = false
      response.db.error = error instanceof Error ? sanitizeError(error.message) : "Unknown error"
    }
  } else {
    response.db.error = "Database disabled or not configured"
  }
  
  // Always return 200 OK - container should stay healthy
  // DB issues are reported in the response body for debugging
  console.log(`[Health] Check completed: app=${response.app}, db.connected=${response.db.connected}, provider=${response.db.provider}`)
  
  return NextResponse.json(response, { status: 200 })
}

/**
 * Sanitize error messages to avoid exposing internal file paths
 */
function sanitizeError(error: string): string {
  // Remove absolute file paths
  let sanitized = error.replace(/\/[a-zA-Z0-9_\-./]+\.db/g, '[database file]')
  sanitized = sanitized.replace(/\/data\/[a-zA-Z0-9_\-./]+/g, '[data path]')
  sanitized = sanitized.replace(/file:[a-zA-Z0-9_\-./]+/g, 'file:[path]')
  
  // Truncate very long errors
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...'
  }
  
  return sanitized
}
