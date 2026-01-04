/**
 * Base URL Helper for Dynamic Domain Detection
 * 
 * This module provides utilities to automatically detect the base URL
 * from incoming requests, useful for deployments on platforms like PhalaCloud
 * where the domain is dynamically assigned.
 * 
 * Priority:
 * 1. Environment variable override (if set and not placeholder)
 * 2. Request headers (x-forwarded-host, host)
 * 3. Fallback to localhost for development
 */

// List of placeholder values that should be treated as "not set"
const PLACEHOLDER_VALUES = [
  "https://YOUR-PHALA-DOMAIN",
  "https://YOUR-DOMAIN",
  "YOUR-PHALA-DOMAIN",
  "YOUR-DOMAIN",
  "https://your-domain.vercel.app",
  "",
]

/**
 * Get base URL from environment variables
 * Returns null if not set or if value is a placeholder
 */
export function getBaseUrlEnv(): string | null {
  const envUrl = 
    process.env.NEXT_PUBLIC_APP_URL || 
    process.env.NEXT_PUBLIC_SITE_URL || 
    process.env.NEXT_PUBLIC_BASE_URL || 
    null

  if (!envUrl) return null
  
  // Check if the value is a placeholder
  const normalizedUrl = envUrl.trim()
  if (PLACEHOLDER_VALUES.some(placeholder => 
    normalizedUrl === placeholder || 
    normalizedUrl.includes("YOUR-") ||
    normalizedUrl.includes("your-domain")
  )) {
    return null
  }

  return normalizedUrl
}

/**
 * Extract base URL from request headers
 * Handles reverse proxy headers (x-forwarded-*) for platforms like PhalaCloud
 * 
 * @param headers - Headers object from NextRequest or next/headers
 * @returns Base URL string (e.g., "https://my-app.phala.network")
 */
export function getBaseUrlFromRequest(headers: Headers): string {
  // Get host from headers (prefer x-forwarded-host for reverse proxy)
  const forwardedHost = headers.get("x-forwarded-host")
  const host = headers.get("host")
  const finalHost = forwardedHost || host || "localhost:3000"
  
  // Get protocol (prefer x-forwarded-proto for reverse proxy)
  // Default to https because PhalaCloud and most production environments use HTTPS
  const forwardedProto = headers.get("x-forwarded-proto")
  const proto = forwardedProto || "https"
  
  // Handle multiple protocols (some proxies send "https,http")
  const finalProto = proto.split(",")[0].trim()
  
  return `${finalProto}://${finalHost}`
}

/**
 * Get base URL with automatic detection
 * 
 * Priority:
 * 1. Environment variable (if set and not placeholder)
 * 2. Request headers (if provided)
 * 3. Fallback to localhost
 * 
 * Usage in Server Components/Route Handlers:
 * ```typescript
 * import { headers } from "next/headers"
 * import { getBaseUrl } from "@/lib/base-url"
 * 
 * // In a route handler
 * const baseUrl = getBaseUrl(request.headers)
 * 
 * // In a server component
 * const headersList = headers()
 * const baseUrl = getBaseUrl(headersList)
 * ```
 * 
 * @param headers - Optional Headers object for request-based detection
 * @returns Base URL string
 */
export function getBaseUrl(headers?: Headers): string {
  // 1. Check environment variable first
  const envUrl = getBaseUrlEnv()
  if (envUrl) {
    return envUrl.replace(/\/$/, "") // Remove trailing slash
  }
  
  // 2. If headers provided, extract from request
  if (headers) {
    return getBaseUrlFromRequest(headers).replace(/\/$/, "")
  }
  
  // 3. Fallback for development
  return "http://localhost:3000"
}

/**
 * Check if the current environment is using auto-detected URL
 * Useful for displaying notices in admin panel
 */
export function isAutoDetectedUrl(): boolean {
  return getBaseUrlEnv() === null
}

/**
 * Get all relevant webhook URLs for display in admin panel
 * 
 * @param headers - Headers object to detect base URL
 * @returns Object with webhook URLs for various providers
 */
export function getWebhookUrls(headers?: Headers): {
  stripe: string
  paypal: string
  base: string
  isAutoDetected: boolean
} {
  const base = getBaseUrl(headers)
  return {
    stripe: `${base}/api/webhooks/stripe`,
    paypal: `${base}/api/payments/paypal/webhook`,
    base,
    isAutoDetected: isAutoDetectedUrl(),
  }
}
