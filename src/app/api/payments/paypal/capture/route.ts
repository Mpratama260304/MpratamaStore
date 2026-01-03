import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PayPal API base URLs
const PAYPAL_BASE_URL = process.env.PAYPAL_ENV === "live" 
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com"

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured")
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token")
  }

  const data = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token") // PayPal order ID
    const orderId = searchParams.get("orderId") // Our order ID

    if (!token || !orderId) {
      return NextResponse.redirect(new URL("/account/orders?error=missing_params", request.url))
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.redirect(new URL("/account/orders?error=order_not_found", request.url))
    }

    // Check if already paid (idempotent)
    if (order.status === "PAID" || order.status === "FULFILLED") {
      return NextResponse.redirect(new URL(`/order/success?order_id=${orderId}`, request.url))
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken()

    // Capture the payment
    const captureResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${token}/capture`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    const captureData = await captureResponse.json()

    console.log("[PayPal] Capture response:", {
      orderId,
      paypalOrderId: token,
      status: captureData.status,
      captureId: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
    })

    if (captureData.status === "COMPLETED") {
      // Payment successful - update order
      const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          gatewayData: {
            ...(typeof order.gatewayData === "object" && order.gatewayData !== null
              ? order.gatewayData
              : {}),
            paypalOrderId: token,
            captureId,
            captureStatus: captureData.status,
            completedAt: new Date().toISOString(),
          },
        },
      })

      return NextResponse.redirect(new URL(`/order/success?order_id=${orderId}&paypal=success`, request.url))
    } else {
      // Payment failed or pending
      console.error("[PayPal] Capture not completed:", captureData)
      return NextResponse.redirect(
        new URL(`/order/${orderId}/payment?paypal=failed&reason=${captureData.status}`, request.url)
      )
    }
  } catch (error) {
    console.error("PayPal capture error:", error)
    const orderId = new URL(request.url).searchParams.get("orderId")
    return NextResponse.redirect(
      new URL(`/order/${orderId || ""}/payment?paypal=error`, request.url)
    )
  }
}
