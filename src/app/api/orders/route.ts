import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const body = await request.json()
    const { items, paymentMethod, gatewayProvider, customerEmail, customerName, customerPhone, notes } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 })
    }

    // Fetch products and validate
    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "PUBLISHED",
      },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Some products are not available" },
        { status: 400 }
      )
    }

    // Check for sold out products
    const soldOutProducts = products.filter((p) => p.isSoldOut)
    if (soldOutProducts.length > 0) {
      return NextResponse.json(
        { error: `${soldOutProducts[0].name} is sold out` },
        { status: 400 }
      )
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!
      const itemTotal = product.price * item.quantity
      subtotal += itemTotal
      
      return {
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productRarity: product.rarity,
        quantity: item.quantity,
        deliveryType: product.deliveryType,
      }
    })

    // Generate order number
    const orderNumber = `MPR-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`

    // Determine payment method - store the actual method chosen
    // paymentMethod values: "STRIPE" | "PAYPAL" | "BANK_TRANSFER" | "GATEWAY" | "MANUAL_TRANSFER"
    let finalPaymentMethod: string
    let finalGatewayProvider: string | null = null
    
    if (paymentMethod === "manual" || paymentMethod === "bank_transfer") {
      finalPaymentMethod = "BANK_TRANSFER"
    } else if (paymentMethod === "gateway" && gatewayProvider) {
      // Legacy format support
      finalPaymentMethod = gatewayProvider.toUpperCase()
      finalGatewayProvider = gatewayProvider.toUpperCase()
    } else if (gatewayProvider === "stripe") {
      finalPaymentMethod = "STRIPE"
      finalGatewayProvider = "STRIPE"
    } else if (gatewayProvider === "paypal") {
      finalPaymentMethod = "PAYPAL"
      finalGatewayProvider = "PAYPAL"
    } else {
      // Default to bank transfer if no method specified
      finalPaymentMethod = "BANK_TRANSFER"
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        customerEmail: customerEmail || session.user.email,
        customerName: customerName || session.user.username || "",
        customerPhone,
        subtotal,
        total: subtotal, // No discount for now
        currency: "IDR",
        status: "PENDING_PAYMENT",
        paymentMethod: finalPaymentMethod,
        paymentStatus: "PENDING",
        gatewayProvider: finalGatewayProvider,
        notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    })

    // Create audit log
    await createAuditLog({
      action: "order.create",
      entityType: "Order",
      entityId: order.id,
      description: `Order ${orderNumber} created with ${orderItems.length} items, payment method: ${finalPaymentMethod}`,
      userId: session.user.id,
    })

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
      },
    })
  } catch (error) {
    console.error("Order creation error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: session.user.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: { take: 1 },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId: session.user.id } }),
    ])

    return NextResponse.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Orders fetch error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login to view orders" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
