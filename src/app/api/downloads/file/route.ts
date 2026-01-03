import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { createHmac } from "crypto"
import { readFile } from "fs/promises"
import { join } from "path"

function verifySignature(
  assetId: string,
  userId: string,
  orderId: string,
  expires: string,
  signature: string
): boolean {
  const data = `${assetId}:${userId}:${orderId}:${expires}`
  const expectedSignature = createHmac("sha256", process.env.JWT_SECRET || "secret")
    .update(data)
    .digest("hex")

  return signature === expectedSignature
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get("asset")
    const userId = searchParams.get("user")
    const orderId = searchParams.get("order")
    const expires = searchParams.get("expires")
    const signature = searchParams.get("sig")

    // Validate parameters
    if (!assetId || !userId || !orderId || !expires || !signature) {
      return NextResponse.json({ error: "Invalid download link" }, { status: 400 })
    }

    // Check expiration
    const expiresAt = parseInt(expires)
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { error: "Download link has expired. Please request a new one." },
        { status: 410 }
      )
    }

    // Verify signature
    if (!verifySignature(assetId, userId, orderId, expires, signature)) {
      return NextResponse.json({ error: "Invalid download link" }, { status: 403 })
    }

    // Verify order ownership and status
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: { in: ["PAID", "FULFILLED"] },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or not eligible for download" },
        { status: 404 }
      )
    }

    // Get the asset
    const asset = await prisma.digitalAsset.findUnique({
      where: { id: assetId },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Log the download
    await createAuditLog({
      action: "download.complete",
      entityType: "DigitalAsset",
      entityId: assetId,
      description: `File downloaded: ${asset.filename} for order ${order.orderNumber}`,
      userId,
    })

    // For local files, read and serve
    const filePath = join(process.cwd(), "private", "downloads", asset.storageKey)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": asset.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${asset.filename}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      })
    } catch {
      // File not found locally
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("File download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
