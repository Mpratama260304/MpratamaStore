import { NextResponse } from "next/server"
import { getPrismaClient, isDbEnabled } from "@/lib/db"
import * as argon2 from "argon2"

// Force dynamic
export const dynamic = 'force-dynamic'

/**
 * POST /api/setup/force-admin
 * 
 * Force creates or resets admin user using environment variables.
 * This is used to fix deployments where admin wasn't created properly.
 * 
 * Requires valid AUTH_SECRET as Authorization header for security.
 * 
 * Environment variables used:
 * - ADMIN_EMAIL
 * - ADMIN_USERNAME  
 * - ADMIN_PASSWORD
 * - AUTH_SECRET (for authorization)
 */
export async function POST(request: Request) {
  try {
    // Security check - require AUTH_SECRET
    const authHeader = request.headers.get('Authorization')
    const expectedAuth = `Bearer ${process.env.AUTH_SECRET || 'fallback-secret-key-32-characters'}`
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({
        ok: false,
        error: "Unauthorized"
      }, { status: 401 })
    }

    // Check if database is enabled
    if (!isDbEnabled()) {
      return NextResponse.json({
        ok: false,
        error: "Database not configured"
      }, { status: 500 })
    }

    const client = getPrismaClient()
    if (!client) {
      return NextResponse.json({
        ok: false,
        error: "Database client not available"
      }, { status: 500 })
    }

    // Get credentials from environment
    const email = process.env.ADMIN_EMAIL
    const username = process.env.ADMIN_USERNAME
    const password = process.env.ADMIN_PASSWORD

    if (!email || !username || !password) {
      return NextResponse.json({
        ok: false,
        error: "ADMIN_EMAIL, ADMIN_USERNAME, or ADMIN_PASSWORD not set in environment"
      }, { status: 400 })
    }

    // Hash password
    const passwordHash = await argon2.hash(password)

    // Check if user exists with this email
    const existingUser = await client.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      // Update existing user to admin with new password
      await client.user.update({
        where: { email: email.toLowerCase() },
        data: {
          passwordHash,
          role: "ADMIN",
          isActive: true,
          emailVerified: new Date(),
        }
      })

      console.log(`[Force Admin] Updated existing user to admin: ${email}`)

      return NextResponse.json({
        ok: true,
        message: "Admin user updated",
        email: email.toLowerCase()
      })
    }

    // Check if username is taken
    const usernameExists = await client.user.findUnique({
      where: { username: username.toLowerCase() }
    })

    if (usernameExists) {
      // Update the user with this username instead
      await client.user.update({
        where: { username: username.toLowerCase() },
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: "ADMIN",
          isActive: true,
          emailVerified: new Date(),
        }
      })

      console.log(`[Force Admin] Updated user by username to admin: ${username}`)

      return NextResponse.json({
        ok: true,
        message: "Admin user updated by username",
        email: email.toLowerCase()
      })
    }

    // Create new admin user
    const newAdmin = await client.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        firstName: "Admin",
        lastName: "",
        emailVerified: new Date(),
        isActive: true,
      }
    })

    console.log(`[Force Admin] Created new admin: ${email}`)

    return NextResponse.json({
      ok: true,
      message: "Admin user created",
      email: newAdmin.email,
      id: newAdmin.id
    })

  } catch (error) {
    console.error('[Force Admin] Error:', error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
