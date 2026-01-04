import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

// Disable body parsing - we need raw body for signature verification
export const dynamic = "force-dynamic"

/**
 * Check if Stripe webhook is configured
 */
function isWebhookConfigured(): { configured: boolean; error?: string } {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  if (!secretKey || secretKey.trim() === '') {
    return { configured: false, error: "Stripe secret key not configured" }
  }
  if (!webhookSecret || webhookSecret.trim() === '') {
    return { configured: false, error: "Stripe webhook secret not configured" }
  }
  return { configured: true }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe webhook is configured
    const configCheck = isWebhookConfigured()
    if (!configCheck.configured) {
      console.warn("[STRIPE WEBHOOK] Not configured:", configCheck.error)
      return NextResponse.json(
        { error: "Stripe webhook not configured", details: configCheck.error },
        { status: 501 }
      )
    }

    // Using type assertion to avoid version mismatch in different environments
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!) as Stripe

    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("Stripe webhook: Missing signature")
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err)
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutExpired(session)
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(paymentIntent)
        break
      }

      default:
        console.log(`Stripe webhook: Unhandled event type ${event.type}`)
    }

    // Return 200 quickly
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId

  if (!orderId) {
    console.error("Stripe webhook: Missing orderId in metadata")
    return
  }

  // Check if already processed (idempotency)
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentStatus: true, gatewayData: true },
  })

  if (!existingOrder) {
    console.error(`Stripe webhook: Order ${orderId} not found`)
    return
  }

  // Check if already paid (idempotent)
  if (existingOrder.status === "PAID" || existingOrder.status === "FULFILLED" || 
      existingOrder.paymentStatus === "PAID") {
    console.log(`Stripe webhook: Order ${orderId} already processed`)
    return
  }

  // Parse existing gatewayData if present
  let existingData: Record<string, unknown> = {}
  if (existingOrder.gatewayData) {
    try {
      existingData = JSON.parse(existingOrder.gatewayData)
    } catch {
      existingData = {}
    }
  }

  // Update order to PAID
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentLastError: null, // Clear any errors
      gatewayData: JSON.stringify({
        ...existingData,
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string" 
          ? session.payment_intent 
          : session.payment_intent?.id || null,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        completedAt: new Date().toISOString(),
      }),
    },
  })

  console.log(`Stripe webhook: Order ${orderId} marked as PAID`)
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId

  if (!orderId) {
    console.error("Stripe webhook: Missing orderId in metadata for expired session")
    return
  }

  // Only update if still pending
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentStatus: true },
  })

  if (order && (order.status === "PENDING_PAYMENT" || order.status === "CREATED" ||
      order.paymentStatus === "PENDING" || order.paymentStatus === "PROCESSING")) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PENDING_PAYMENT", // Keep pending so user can retry
        paymentStatus: "EXPIRED",
        paymentLastError: "Payment session expired. Please try again.",
        gatewayData: JSON.stringify({
          sessionId: session.id,
          expiredAt: new Date().toISOString(),
        }),
      },
    })
    console.log(`Stripe webhook: Order ${orderId} payment session expired`)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId
  const errorMessage = paymentIntent.last_payment_error?.message || "Payment failed"

  if (!orderId) {
    // Try to find order by payment intent
    const order = await prisma.order.findFirst({
      where: {
        gatewayReference: paymentIntent.id,
      },
      select: { id: true, status: true, paymentStatus: true },
    })

    if (!order) {
      console.error("Stripe webhook: Could not find order for failed payment")
      return
    }

    if (order.status === "PENDING_PAYMENT" || order.status === "CREATED" ||
        order.paymentStatus === "PENDING" || order.paymentStatus === "PROCESSING") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          paymentLastError: errorMessage,
          gatewayData: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            failedAt: new Date().toISOString(),
            lastError: errorMessage,
            errorCode: paymentIntent.last_payment_error?.code,
          }),
        },
      })
      console.log(`Stripe webhook: Payment failed for order ${order.id}: ${errorMessage}`)
    }
    return
  }

  // If we have orderId in metadata
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentStatus: true },
  })

  if (order && (order.status === "PENDING_PAYMENT" || order.status === "CREATED" ||
      order.paymentStatus === "PENDING" || order.paymentStatus === "PROCESSING")) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "FAILED",
        paymentLastError: errorMessage,
        gatewayData: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          failedAt: new Date().toISOString(),
          lastError: errorMessage,
          errorCode: paymentIntent.last_payment_error?.code,
        }),
      },
    })
    console.log(`Stripe webhook: Payment failed for order ${orderId}: ${errorMessage}`)
  }
}
