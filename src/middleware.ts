import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret-key-32-characters"
)
const SESSION_COOKIE_NAME = "mpratama_session"

// Routes that require authentication
const protectedRoutes = ["/checkout", "/account", "/order"]

// Routes that require admin access
const adminRoutes = ["/admin"]

// Routes that should redirect to dashboard if logged in
const authRoutes = ["/login", "/register"]

// Cache for setup status (edge runtime compatible)
let cachedSetupStatus: { needsSetup: boolean; checkedAt: number } | null = null
const CACHE_TTL = 30000 // 30 seconds

/**
 * Check if setup is needed by calling internal API
 */
async function checkNeedsSetup(request: NextRequest): Promise<boolean | null> {
  // Check cache first
  if (cachedSetupStatus && Date.now() - cachedSetupStatus.checkedAt < CACHE_TTL) {
    return cachedSetupStatus.needsSetup
  }

  try {
    // Build absolute URL for the API
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const apiUrl = `${protocol}://${host}/api/setup/status`
    
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      console.log('[Middleware] Setup status check failed:', res.status)
      return null
    }
    
    const data = await res.json()
    
    // Cache the result
    cachedSetupStatus = {
      needsSetup: data.needsSetup === true,
      checkedAt: Date.now()
    }
    
    return cachedSetupStatus.needsSetup
  } catch (error) {
    console.log('[Middleware] Error checking setup status:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  // Check if user is authenticated
  let isAuthenticated = false
  let isAdmin = false

  if (token) {
    try {
      const { payload } = await jwtVerify(token, AUTH_SECRET)
      isAuthenticated = true
      isAdmin = payload.role === "ADMIN"
    } catch {
      // Invalid token
    }
  }

  // Handle /setup page
  if (pathname === "/setup") {
    const needsSetup = await checkNeedsSetup(request)
    
    // If setup is not needed (admin exists), redirect away from setup page
    if (needsSetup === false) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    
    // Allow access to setup page
    return NextResponse.next()
  }

  // Handle admin routes - check if setup is needed first
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    const needsSetup = await checkNeedsSetup(request)
    
    // If setup is needed, redirect to setup page
    if (needsSetup === true) {
      return NextResponse.redirect(new URL("/setup", request.url))
    }
    
    // Normal admin auth checks
    if (!isAuthenticated) {
      const url = new URL("/login", request.url)
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Handle login route - check if setup is needed first
  if (pathname === "/login") {
    const needsSetup = await checkNeedsSetup(request)
    
    // If setup is needed, redirect to setup page
    if (needsSetup === true) {
      return NextResponse.redirect(new URL("/setup", request.url))
    }
    
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    
    return NextResponse.next()
  }

  // Handle auth routes (redirect to home if already logged in)
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Handle protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const url = new URL("/login", request.url)
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)"]
}
