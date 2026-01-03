import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    
    const formData = await request.formData()
    const file = formData.get("file") as File
    const orderId = formData.get("orderId") as string

    if (!file || !orderId) {
      return NextResponse.json(
        { error: "Missing file or order ID" },
        { status: 400 }
      )
    }

    // Verify order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
        status: "PENDING_PAYMENT",
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or not eligible for payment proof" },
        { status: 404 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload JPG, PNG or WebP." },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "payment-proofs")
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const ext = file.name.split(".").pop()
    const filename = `${nanoid()}.${ext}`
    const filepath = join(uploadDir, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Create payment proof record
    const proof = await prisma.paymentProof.create({
      data: {
        orderId,
        proofUrl: `/uploads/payment-proofs/${filename}`,
        name: order.customerName,
        email: order.customerEmail,
        method: order.paymentMethod === "MANUAL_TRANSFER" ? "Bank Transfer" : "Gateway",
        amount: order.total,
        status: "SUBMITTED",
      },
    })

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAYMENT_REVIEW" },
    })

    // Create audit log
    await createAuditLog({
      action: "order.create",
      entityType: "PaymentProof",
      entityId: proof.id,
      description: `Payment proof uploaded for order ${order.orderNumber}`,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      proof: {
        id: proof.id,
        status: proof.status,
      },
    })
  } catch (error) {
    console.error("Payment proof upload error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Failed to upload payment proof" },
      { status: 500 }
    )
  }
}
