import { NextResponse } from "next/server"

// Force dynamic to always check fresh config
export const dynamic = "force-dynamic"

/**
 * GET /api/settings/payment-methods
 * Returns which payment methods are enabled based on environment configuration
 * This is safe to expose publicly as it only shows boolean flags
 */
export async function GET() {
  // Check Stripe configuration
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ""
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || ""
  const stripeEnabled = stripeSecretKey.trim() !== "" && 
                         stripeSecretKey !== "your_stripe_secret_key_here" &&
                         !stripeSecretKey.includes("CHANGE_ME")

  // Check PayPal configuration
  const paypalClientId = process.env.PAYPAL_CLIENT_ID || ""
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || ""
  const paypalEnabled = paypalClientId.trim() !== "" && 
                         paypalClientSecret.trim() !== "" &&
                         !paypalClientId.includes("CHANGE_ME")

  // Bank transfer is always enabled (manual process)
  const bankTransferEnabled = true

  return NextResponse.json({
    stripeEnabled,
    paypalEnabled,
    bankTransferEnabled,
  })
}
