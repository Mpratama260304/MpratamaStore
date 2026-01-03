import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyPassword, createSession, checkRateLimit } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Rate limiting
    const rateLimitKey = `login:${email}`
    if (!checkRateLimit(rateLimitKey, 5, 60000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      )
    }

    // Validate input
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid credentials", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(user.passwordHash, password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account has been deactivated" },
        { status: 403 }
      )
    }

    // Create session
    await createSession(user.id, user.role)

    // Audit log
    await createAuditLog({
      action: "user.login",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
