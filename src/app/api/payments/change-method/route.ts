import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const body = await request.json()
    const { orderId, newMethod } = body

    if (!orderId || !newMethod) {
      return NextResponse.json(
        { error: "Order ID and new payment method are required" },
        { status: 400 }
      )
    }

    // Validate method
    const validMethods = ["stripe", "bank_transfer", "paypal"]
    if (!validMethods.includes(newMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      )
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Verify order belongs to user
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Only allow change if not paid or canceled
    if (order.status === "PAID" || order.status === "FULFILLED" || order.status === "CANCELED") {
      return NextResponse.json(
        { error: "Cannot change payment method for this order" },
        { status: 400 }
      )
    }

    // Determine PaymentMethod and GatewayProvider
    let paymentMethod: "MANUAL_TRANSFER" | "GATEWAY" = "MANUAL_TRANSFER"
    let gatewayProvider: string | null = null

    switch (newMethod) {
      case "stripe":
        paymentMethod = "GATEWAY"
        gatewayProvider = "STRIPE"
        break
      case "paypal":
        paymentMethod = "GATEWAY"
        gatewayProvider = "PAYPAL"
        break
      case "bank_transfer":
        paymentMethod = "MANUAL_TRANSFER"
        gatewayProvider = null
        break
    }

    // Update order - use explicit typing to avoid cache issues
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gatewayProvider: gatewayProvider as any,
        // Clear old gateway data when switching methods
        gatewayReference: gatewayProvider ? order.gatewayReference : null,
        gatewayData: gatewayProvider ? (order.gatewayData ?? undefined) : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        paymentMethod: updatedOrder.paymentMethod,
        gatewayProvider: updatedOrder.gatewayProvider,
      },
    })
  } catch (error) {
    console.error("Change payment method error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to change payment method" }, { status: 500 })
  }
}
