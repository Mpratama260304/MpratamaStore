import { NextResponse } from "next/server"
import { getPrismaClient, isDbEnabled } from "@/lib/db"

// Force dynamic - always fresh check
export const dynamic = 'force-dynamic'

/**
 * GET /api/setup/status
 * 
 * Returns whether the application needs initial setup (first admin user creation)
 * 
 * Response:
 * - needsSetup: true if no admin user exists
 * - needsSetup: false if admin user already exists
 */
export async function GET() {
  try {
    // If database is not enabled, we can't check setup status
    if (!isDbEnabled()) {
      return NextResponse.json({
        ok: false,
        needsSetup: true,
        error: "Database not configured",
        dbConnected: false
      })
    }

    const client = getPrismaClient()
    if (!client) {
      return NextResponse.json({
        ok: false,
        needsSetup: true,
        error: "Database client not available",
        dbConnected: false
      })
    }

    // Check if any admin user exists
    try {
      const adminCount = await client.user.count({
        where: { role: "ADMIN" }
      })

      return NextResponse.json({
        ok: true,
        needsSetup: adminCount === 0,
        adminCount,
        dbConnected: true
      })
    } catch (error) {
      // If table doesn't exist (migration not run), setup is needed
      const message = error instanceof Error ? error.message : String(error)
      
      if (message.includes('no such table') || 
          message.includes('does not exist') ||
          message.includes('P2021')) {
        return NextResponse.json({
          ok: false,
          needsSetup: true,
          error: "Database schema not ready - run migrations first",
          dbConnected: true,
          schemaReady: false
        })
      }

      return NextResponse.json({
        ok: false,
        needsSetup: true,
        error: "Failed to check setup status",
        dbConnected: false
      })
    }
  } catch (error) {
    console.error('[Setup Status] Error:', error)
    return NextResponse.json({
      ok: false,
      needsSetup: true,
      error: "Internal server error"
    }, { status: 500 })
  }
}
