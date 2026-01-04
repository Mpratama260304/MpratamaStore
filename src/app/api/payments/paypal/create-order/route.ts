import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { getBaseUrl } from "@/lib/base-url"

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
    const error = await response.text()
    console.error("PayPal auth error:", error)
    throw new Error("Failed to get PayPal access token")
  }

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Verify order belongs to user
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Verify order is pending payment
    if (order.status !== "PENDING_PAYMENT" && order.status !== "CREATED") {
      return NextResponse.json(
        { error: "Order is not pending payment" },
        { status: 400 }
      )
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken()

    // Build base URL for return/cancel - auto-detect from request headers
    const baseUrl = getBaseUrl(request.headers)

    // Convert IDR to USD for PayPal (PayPal doesn't support IDR directly in many regions)
    // Using approximate rate: 1 USD = 15,500 IDR
    const EXCHANGE_RATE = 15500
    let currency = order.currency.toUpperCase()
    let totalAmount = order.total

    // If currency is IDR, convert to USD for PayPal
    if (currency === "IDR") {
      currency = "USD"
      totalAmount = Math.max(1, Math.ceil(order.total / EXCHANGE_RATE * 100) / 100) // Min $1
    }

    // Debug logging
    console.log("[PayPal] Creating order:", {
      orderId: order.id,
      originalCurrency: order.currency,
      originalTotal: order.total,
      paypalCurrency: currency,
      paypalTotal: totalAmount,
    })

    // Create PayPal order
    const paypalOrderData = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: order.id,
        description: `Order ${order.orderNumber}`,
        custom_id: order.id,
        amount: {
          currency_code: currency,
          value: totalAmount.toFixed(2),
        },
      }],
      application_context: {
        brand_name: "MpratamaStore",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${baseUrl}/api/payments/paypal/capture?orderId=${order.id}`,
        cancel_url: `${baseUrl}/order/${order.id}/payment?paypal=cancelled`,
      },
    }

    const createResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paypalOrderData),
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      console.error("PayPal create order error:", error)
      return NextResponse.json(
        { error: "Failed to create PayPal order" },
        { status: 500 }
      )
    }

    const paypalOrder = await createResponse.json()

    // Find approval URL
    const approvalUrl = paypalOrder.links?.find(
      (link: { rel: string; href: string }) => link.rel === "approve"
    )?.href

    if (!approvalUrl) {
      console.error("PayPal no approval URL:", paypalOrder)
      return NextResponse.json(
        { error: "Failed to get PayPal approval URL" },
        { status: 500 }
      )
    }

    // Update order with PayPal info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.order.update({
      where: { id: order.id },
      data: {
        gatewayProvider: "PAYPAL" as any,
        gatewayReference: paypalOrder.id,
        gatewayData: JSON.stringify({
          paypalOrderId: paypalOrder.id,
          status: paypalOrder.status,
          createdAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      paypalOrderId: paypalOrder.id,
      approvalUrl,
    })
  } catch (error) {
    console.error("PayPal create order error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create PayPal order" },
      { status: 500 }
    )
  }
}
