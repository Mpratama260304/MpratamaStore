import * as argon2 from 'argon2'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { v4 as uuidv4 } from 'uuid'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret-key-32-characters')
const SESSION_COOKIE_NAME = 'mpratama_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

interface TokenPayload {
  userId: string
  sessionId: string
  role: string
  [key: string]: unknown  // Required for JWTPayload compatibility
}

async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(AUTH_SECRET)
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function createSession(userId: string, role: string): Promise<string> {
  const sessionId = uuidv4()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)
  
  // Store session in DB
  await prisma.session.create({
    data: {
      id: sessionId,
      token: sessionId,
      userId,
      expiresAt,
    },
  })
  
  // Create JWT
  const token = await createToken({ userId, sessionId, role })
  
  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  
  return token
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!token) return null
  
  const payload = await verifyToken(token)
  if (!payload) return null
  
  // Verify session exists in DB
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
  })
  
  if (!session || session.expiresAt < new Date()) {
    return null
  }
  
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isActive: true,
    },
  })
  
  if (!user || !user.isActive) return null
  
  return { user, sessionId: payload.sessionId }
}

export async function destroySession() {
  const session = await getSession()
  
  if (session) {
    await prisma.session.delete({
      where: { id: session.sessionId },
    }).catch(() => {})
  }
  
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  
  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  
  return session
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  
  if (!record || record.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}
