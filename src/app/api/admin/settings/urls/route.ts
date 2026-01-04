import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { getWebhookUrls } from "@/lib/base-url"

/**
 * GET /api/admin/settings/urls
 * Returns auto-detected webhook URLs based on request headers
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    await requireAdmin()

    const urls = getWebhookUrls(request.headers)

    return NextResponse.json({
      baseUrl: urls.base,
      webhookUrls: {
        stripe: urls.stripe,
        paypal: urls.paypal,
      },
      isAutoDetected: urls.isAutoDetected,
      message: urls.isAutoDetected 
        ? "URLs auto-detected from request headers (no NEXT_PUBLIC_APP_URL set)"
        : "URLs from environment variable NEXT_PUBLIC_APP_URL",
    })
  } catch (error) {
    console.error("Error getting URLs:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to get URLs" }, { status: 500 })
  }
}
