import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { getBaseUrl } from "@/lib/base-url"

// Zero-decimal currencies for Stripe (amount is in whole units, not cents)
// IMPORTANT: As of API version 2025-12-15, IDR is NOT zero-decimal!
// Stripe treats IDR as two-decimal currency (divide by 100 to get display value)
// Reference: https://stripe.com/docs/currencies#zero-decimal
const ZERO_DECIMAL_CURRENCIES = [
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf',
  'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'
  // NOTE: 'idr' is NOT zero-decimal in current Stripe API!
]

// Minimum amounts for Stripe (in base currency units)
const STRIPE_MINIMUM_AMOUNTS: Record<string, number> = {
  idr: 7000, // Rp 7,000 minimum
  usd: 0.50, // $0.50 minimum
  eur: 0.50, // €0.50 minimum
}

/**
 * Check if Stripe is properly configured
 */
function isStripeConfigured(): { configured: boolean; error?: string } {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey || secretKey.trim() === '') {
    return { configured: false, error: "Stripe secret key not configured" }
  }
  return { configured: true }
}

/**
 * Convert amount to Stripe unit_amount (always returns integer number)
 * For IDR: Rp199,000 → 19900000 (multiply by 100)
 * For USD: $10.00 → 1000 (multiply by 100)
 * For JPY: ¥1000 → 1000 (no conversion)
 */
function toStripeUnitAmount(amount: unknown, currency: string): number {
  // Force convert to number
  const numAmount = Number(amount)
  if (isNaN(numAmount)) {
    throw new Error(`Invalid amount: ${amount}`)
  }
  
  const currencyLower = currency.toLowerCase()
  if (ZERO_DECIMAL_CURRENCIES.includes(currencyLower)) {
    // Zero-decimal: return as integer (JPY 1000 → 1000)
    return Math.round(numAmount)
  }
  // Two-decimal currencies (including IDR): multiply by 100
  // IDR 199000 → 19900000 (Stripe will display as Rp199,000.00)
  return Math.round(numAmount * 100)
}

/**
 * Ensure value is an integer number
 */
function ensureInteger(value: unknown, fieldName: string): number {
  const num = Number(value)
  if (isNaN(num) || !Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number, got: ${value}`)
  }
  return Math.round(num)
}

export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration first
    const stripeCheck = isStripeConfigured()
    if (!stripeCheck.configured) {
      return NextResponse.json(
        { 
          error: "Stripe payment is not available. Please use bank transfer or PayPal.",
          code: "STRIPE_NOT_CONFIGURED"
        },
        { status: 503 }
      )
    }
    
    const session = await requireAuth()
    
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                images: { take: 1 },
              },
            },
          },
        },
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

    // Initialize Stripe with env variable
    // Using type assertion to avoid version mismatch in different environments
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!) as Stripe

    // Build base URL - auto-detect from request headers for dynamic domains (PhalaCloud etc.)
    const baseUrl = getBaseUrl(request.headers)
    console.log("[STRIPE] Base URL detected:", baseUrl)
    
    // Normalize currency
    const currency = order.currency.toLowerCase()
    
    // Check minimum amount
    const minAmount = STRIPE_MINIMUM_AMOUNTS[currency] || 0.50
    if (order.total < minAmount) {
      const formattedMin = currency === 'idr' 
        ? `Rp ${minAmount.toLocaleString()}`
        : `${currency.toUpperCase()} ${minAmount}`
      return NextResponse.json(
        { 
          error: `Minimum order amount for Stripe is ${formattedMin}. Please use bank transfer for smaller amounts.`,
          code: "AMOUNT_TOO_SMALL"
        },
        { status: 400 }
      )
    }

    // ══════════════════════════════════════════════════════════════
    // BUILD LINE ITEMS WITH STRICT TYPE ENFORCEMENT
    // ══════════════════════════════════════════════════════════════
    
    // Create line_items as a proper ARRAY with NUMBER types
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    
    for (const item of order.items) {
      // FORCE convert to numbers (handles string from DB/JSON)
      const unitAmount: number = toStripeUnitAmount(item.productPrice, currency)
      const quantity: number = ensureInteger(item.quantity, "quantity")
      
      // Validation: unit_amount must be positive integer
      if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
        throw new Error(`Invalid unit_amount: ${unitAmount} (from productPrice: ${item.productPrice})`)
      }
      
      // Validation: quantity must be positive integer
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity: ${quantity}`)
      }
      
      // Build image URL
      const imageUrl = item.product?.images?.[0]?.url
      const images: string[] = imageUrl ? [`${baseUrl}${imageUrl}`] : []
      
      // Push to array (NOT object assignment)
      lineItems.push({
        price_data: {
          currency: currency, // lowercase string
          product_data: {
            name: String(item.productName), // ensure string
            images: images,
          },
          unit_amount: unitAmount, // NUMBER (integer)
        },
        quantity: quantity, // NUMBER (integer)
      })
    }

    // ══════════════════════════════════════════════════════════════
    // HARD VALIDATION BEFORE CALLING STRIPE
    // ══════════════════════════════════════════════════════════════
    
    // Ensure line_items is a real array
    if (!Array.isArray(lineItems)) {
      throw new Error("line_items must be an array")
    }
    
    if (lineItems.length === 0) {
      return NextResponse.json({ error: "Order has no items" }, { status: 400 })
    }

    // Validate each line item's types
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i]
      const unitAmount = item.price_data?.unit_amount
      const qty = item.quantity
      
      if (typeof unitAmount !== "number" || !Number.isInteger(unitAmount)) {
        throw new Error(`line_items[${i}].unit_amount must be integer number, got: ${typeof unitAmount} = ${unitAmount}`)
      }
      if (typeof qty !== "number" || !Number.isInteger(qty)) {
        throw new Error(`line_items[${i}].quantity must be integer number, got: ${typeof qty} = ${qty}`)
      }
    }
    
    // Calculate total for sanity check
    const calculatedTotal = lineItems.reduce((sum, item) => {
      return sum + (item.price_data?.unit_amount || 0) * (item.quantity || 0)
    }, 0)
    
    // For IDR: calculatedTotal is now in "cents" (e.g., Rp199,000 = 19900000)
    // Stripe minimum is ~50 cents USD = ~8000 IDR = 800000 in Stripe units
    // But let's be safe with 700000 (Rp7,000)
    const MIN_IDR_STRIPE_UNITS = 700000 // Rp7,000 in Stripe's unit (7000 * 100)
    if (currency === "idr" && calculatedTotal < MIN_IDR_STRIPE_UNITS) {
      const displayAmount = calculatedTotal / 100
      return NextResponse.json(
        { error: `Minimum order amount for Stripe is Rp 7,000. Your order is Rp ${displayAmount.toLocaleString()}` },
        { status: 400 }
      )
    }
    
    // Sanity check: ensure conversion happened correctly
    // If order.total is 199000 (Rp199,000), calculatedTotal should be ~19900000
    const expectedStripeTotal = Number(order.total) * 100
    if (currency === "idr" && Math.abs(calculatedTotal - expectedStripeTotal) > 100) {
      console.error("[STRIPE CRITICAL] Amount mismatch!", {
        orderTotal: order.total,
        expectedStripeTotal,
        calculatedTotal,
        difference: Math.abs(calculatedTotal - expectedStripeTotal)
      })
      return NextResponse.json(
        { error: "Payment amount validation failed. Please contact support." },
        { status: 500 }
      )
    }

    // ══════════════════════════════════════════════════════════════
    // FINAL PAYLOAD LOGGING (before Stripe call)
    // ══════════════════════════════════════════════════════════════
    
    const paymentMethodTypes: ("card")[] = ["card"] // Explicit array type
    
    console.log("═══════════════════════════════════════════════════════")
    console.log("[STRIPE PAYLOAD CHECK - BEFORE API CALL]")
    console.log("Currency:", currency, "(IDR is TWO-DECIMAL in Stripe)")
    console.log("Order Total from DB:", order.total, "IDR")
    console.log("payment_method_types:", paymentMethodTypes)
    console.log("  - Is Array?", Array.isArray(paymentMethodTypes))
    console.log("line_items count:", lineItems.length, "- Is Array?", Array.isArray(lineItems))
    
    lineItems.forEach((item, idx) => {
      const ua = item.price_data?.unit_amount || 0
      const displayAmount = currency === "idr" ? ua / 100 : ua / 100
      console.log(`line_items[${idx}]:`)
      console.log(`  unit_amount: ${ua} (type: ${typeof ua}) → Display: Rp ${displayAmount.toLocaleString()}`)
      console.log(`  quantity: ${item.quantity} (type: ${typeof item.quantity})`)
    })
    
    const displayTotal = currency === "idr" ? calculatedTotal / 100 : calculatedTotal / 100
    console.log(`Calculated Total: ${calculatedTotal} → Display: Rp ${displayTotal.toLocaleString()}`)
    console.log("═══════════════════════════════════════════════════════")

    // ══════════════════════════════════════════════════════════════
    // CREATE STRIPE CHECKOUT SESSION
    // ══════════════════════════════════════════════════════════════
    
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes, // ARRAY ["card"]
      line_items: lineItems, // ARRAY of line items
      customer_email: order.customerEmail || undefined,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: session.user.id,
      },
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${baseUrl}/order/${order.id}/payment?stripe=cancelled`,
    })

    console.log("[STRIPE] Checkout session created successfully!")
    console.log("  Session ID:", checkoutSession.id)
    console.log("  Amount Total:", checkoutSession.amount_total)
    console.log("  Currency:", checkoutSession.currency)
    console.log("  Success URL:", `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`)

    // Update order with Stripe session info and payment status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: "STRIPE",
        paymentStatus: "PROCESSING",
        gatewayProvider: "STRIPE",
        gatewayReference: checkoutSession.id,
        gatewayData: JSON.stringify({
          sessionId: checkoutSession.id,
          paymentIntentId: typeof checkoutSession.payment_intent === "string" 
            ? checkoutSession.payment_intent 
            : checkoutSession.payment_intent?.id || null,
          checkoutUrl: checkoutSession.url,
          createdAt: new Date().toISOString(),
        }),
        paymentLastError: null, // Clear any previous errors
      },
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 })
    }
    
    if (error instanceof Stripe.errors.StripeError) {
      console.error("[STRIPE API ERROR]", {
        type: error.type,
        code: error.code,
        message: error.message,
        param: error.param,
      })
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
