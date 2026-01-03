import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

// Disable body parsing - we need raw body for signature verification
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Get payment settings
    const paymentSettings = await prisma.paymentSetting.findFirst()
    
    if (!paymentSettings?.stripeSecretKey || !paymentSettings?.stripeWebhookSecret) {
      console.error("Stripe webhook: Missing configuration")
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      )
    }

    const stripe = new Stripe(paymentSettings.stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
    })

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
        paymentSettings.stripeWebhookSecret
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
    select: { status: true, gatewayData: true },
  })

  if (!existingOrder) {
    console.error(`Stripe webhook: Order ${orderId} not found`)
    return
  }

  // Check if already paid (idempotent)
  if (existingOrder.status === "PAID" || existingOrder.status === "FULFILLED") {
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
      paidAt: new Date(),
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
    select: { status: true },
  })

  if (order && (order.status === "PENDING_PAYMENT" || order.status === "CREATED")) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELED",
        gatewayData: JSON.stringify({
          sessionId: session.id,
          expiredAt: new Date().toISOString(),
        }),
      },
    })
    console.log(`Stripe webhook: Order ${orderId} expired/canceled`)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId

  if (!orderId) {
    // Try to find order by payment intent
    const order = await prisma.order.findFirst({
      where: {
        gatewayReference: paymentIntent.id,
      },
      select: { id: true, status: true },
    })

    if (!order) {
      console.error("Stripe webhook: Could not find order for failed payment")
      return
    }

    if (order.status === "PENDING_PAYMENT" || order.status === "CREATED") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          gatewayData: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            failedAt: new Date().toISOString(),
            lastError: paymentIntent.last_payment_error?.message,
          }),
        },
      })
      console.log(`Stripe webhook: Payment failed for order ${order.id}`)
    }
  }
}
