import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const proof = await prisma.paymentProof.findUnique({
      where: { id: params.id },
      include: { order: true },
    })

    if (!proof) {
      return NextResponse.json({ error: "Payment proof not found" }, { status: 404 })
    }

    // Update payment proof status
    await prisma.paymentProof.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
    })

    // Update order status to PAID
    await prisma.order.update({
      where: { id: proof.orderId },
      data: { status: "PAID" },
    })

    await createAuditLog({
      action: "payment.approve",
      entityType: "PaymentProof",
      entityId: params.id,
      description: `Payment approved for order ${proof.order.orderNumber}`,
      userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Payment approval error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to approve payment" }, { status: 500 })
  }
}
