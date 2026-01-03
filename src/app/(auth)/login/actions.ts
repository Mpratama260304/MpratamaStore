"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyPassword, createSession, checkRateLimit } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { redirect } from "next/navigation"
import type { LoginState } from "./state"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const redirectTo = formData.get("redirectTo") as string | null

    // Validate required fields early
    if (!email || !password) {
      return {
        ok: false,
        message: "Email and password are required.",
      }
    }

    // Rate limiting
    const rateLimitKey = `login:${email}`
    if (!checkRateLimit(rateLimitKey, 5, 60000)) {
      return {
        ok: false,
        message: "Too many login attempts. Please try again later.",
      }
    }

    // Validate input
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      return {
        ok: false,
        message: "Please fix the errors below.",
        errors: result.error.flatten().fieldErrors,
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return {
        ok: false,
        message: "Invalid email or password",
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(user.passwordHash, password)
    if (!isValidPassword) {
      return {
        ok: false,
        message: "Invalid email or password",
      }
    }

    // Check if account is active
    if (!user.isActive) {
      return {
        ok: false,
        message: "Your account has been deactivated",
      }
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

    // Redirect based on role or requested redirect
    // Validate redirectTo is a safe internal path
    let destination = redirectTo || (user.role === "ADMIN" ? "/admin" : "/")
    if (destination.startsWith("//") || destination.includes("://")) {
      destination = "/admin"
    }
    redirect(destination)
  } catch (error: unknown) {
    // Re-throw redirect errors (Next.js uses NEXT_REDIRECT property)
    if (error && typeof error === "object" && "digest" in error) {
      const digest = (error as { digest?: string }).digest
      if (digest?.startsWith("NEXT_REDIRECT")) {
        throw error
      }
    }
    // Return safe error state for any unexpected errors
    console.error("Login error:", error)
    return {
      ok: false,
      message: "An unexpected error occurred. Please try again.",
    }
  }
}
