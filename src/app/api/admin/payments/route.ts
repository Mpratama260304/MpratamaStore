import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  try {
    await requireAdmin()

    const payments = await prisma.paymentProof.findMany({
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            user: {
              select: {
                email: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // SUBMITTED first
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error("Payments fetch error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
