"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPassword, verifyPassword, createSession, destroySession, checkRateLimit } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { redirect } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export type ActionResult = {
  success: boolean
  error?: string
  errors?: Record<string, string[]>
}

export async function login(formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  // Rate limiting
  const rateLimitKey = `login:${rawData.email}`
  if (!checkRateLimit(rateLimitKey, 5, 60000)) {
    return { success: false, error: "Too many login attempts. Please try again later." }
  }

  const result = loginSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors }
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!user) {
    return { success: false, error: "Invalid email or password" }
  }

  const isValidPassword = await verifyPassword(user.passwordHash, password)
  if (!isValidPassword) {
    return { success: false, error: "Invalid email or password" }
  }

  if (!user.isActive) {
    return { success: false, error: "Your account has been deactivated" }
  }

  await createSession(user.id, user.role)
  await createAuditLog({
    action: "user.login",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
  })

  redirect("/")
}

export async function register(formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  // Rate limiting
  const rateLimitKey = `register:${rawData.email}`
  if (!checkRateLimit(rateLimitKey, 3, 60000)) {
    return { success: false, error: "Too many registration attempts. Please try again later." }
  }

  const result = registerSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors }
  }

  const { email, username, password } = result.data

  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (existingEmail) {
    return { success: false, error: "Email already registered" }
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  })
  if (existingUsername) {
    return { success: false, error: "Username already taken" }
  }

  const hashedPassword = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash: hashedPassword,
      role: "CUSTOMER",
    },
  })

  await createSession(user.id, user.role)
  await createAuditLog({
    action: "user.register",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
  })

  redirect("/")
}

export async function logout(): Promise<void> {
  await destroySession()
  redirect("/login")
}

export async function forgotPassword(formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email") as string,
  }

  // Rate limiting
  const rateLimitKey = `forgot:${rawData.email}`
  if (!checkRateLimit(rateLimitKey, 3, 300000)) {
    return { success: false, error: "Too many requests. Please try again later." }
  }

  const result = forgotPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors }
  }

  const { email } = result.data

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  // Always return success to prevent email enumeration
  if (!user) {
    return { success: true }
  }

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email: email.toLowerCase() },
  })

  // Create new token
  const token = uuidv4()
  await prisma.passwordResetToken.create({
    data: {
      token,
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  })

  // TODO: Send email with reset link
  // For now, just log the token in development
  if (process.env.NODE_ENV === "development") {
    console.log(`Password reset link: ${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`)
  }

  return { success: true }
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const rawData = {
    token: formData.get("token") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors }
  }

  const { token, password } = result.data

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!resetToken) {
    return { success: false, error: "Invalid or expired reset token" }
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } })
    return { success: false, error: "Reset token has expired" }
  }

  if (resetToken.usedAt) {
    return { success: false, error: "Reset token has already been used" }
  }

  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
  })

  if (!user) {
    return { success: false, error: "User not found" }
  }

  const hashedPassword = await hashPassword(password)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
    // Invalidate all existing sessions
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
  ])

  await createAuditLog({
    action: "user.password_reset",
    entityType: "User",
    entityId: user.id,
    actorId: user.id,
  })

  redirect("/login?message=Password reset successful. Please login with your new password.")
}
