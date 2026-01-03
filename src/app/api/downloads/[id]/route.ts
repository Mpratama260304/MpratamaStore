import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { createHmac } from "crypto"

// Generate a signed URL that expires after a certain time
function generateSignedUrl(
  assetId: string,
  userId: string,
  orderId: string,
  expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours
): string {
  const expires = Date.now() + expiresIn
  const data = `${assetId}:${userId}:${orderId}:${expires}`
  const signature = createHmac("sha256", process.env.JWT_SECRET || "secret")
    .update(data)
    .digest("hex")

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const params = new URLSearchParams({
    asset: assetId,
    user: userId,
    order: orderId,
    expires: expires.toString(),
    sig: signature,
  })

  return `${baseUrl}/api/downloads/file?${params.toString()}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    // Verify the user owns this order and it's paid
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
        status: { in: ["PAID", "FULFILLED"] },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                digitalAsset: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or not eligible for download" },
        { status: 404 }
      )
    }

    // Check if the asset belongs to a product in this order
    const asset = order.items
      .map((item) => item.product?.digitalAsset)
      .find((a) => a?.id === params.id)

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found in this order" },
        { status: 404 }
      )
    }

    // Generate signed download URL
    const downloadUrl = generateSignedUrl(params.id, session.user.id, orderId)

    // Log the download request
    await createAuditLog({
      action: "download.request",
      entityType: "DigitalAsset",
      entityId: params.id,
      description: `Download requested for asset ${asset.filename} from order ${order.orderNumber}`,
      userId: session.user.id,
    })

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error("Download URL generation error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Please login to download" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 })
  }
}
