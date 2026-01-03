import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().nullable().optional(),
  currency: z.string().default("IDR"),
  rarity: z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]).default("COMMON"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isSoldOut: z.boolean().default(false),
  deliveryType: z.enum(["FILE", "LICENSE_KEY", "EXTERNAL_LINK"]).default("FILE"),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string(), alt: z.string() })).default([]),
  stats: z.record(z.number()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        tags: true,
        images: true,
        digitalAsset: true,
        licenseKeys: { where: { isUsed: false } },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Product fetch error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const validatedData = productSchema.parse(body)

    // Check if slug exists on another product
    const existingProduct = await prisma.product.findFirst({
      where: {
        slug: validatedData.slug,
        NOT: { id: params.id },
      },
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this slug already exists" },
        { status: 400 }
      )
    }

    // Parse description if it's a string
    let description = null
    if (validatedData.description) {
      try {
        description = JSON.parse(validatedData.description)
      } catch {
        description = {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: validatedData.description }] }]
        }
      }
    }

    // Delete existing images and recreate
    await prisma.productImage.deleteMany({
      where: { productId: params.id },
    })

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        shortDescription: validatedData.shortDescription,
        description,
        price: validatedData.price,
        compareAtPrice: validatedData.compareAtPrice,
        currency: validatedData.currency,
        rarity: validatedData.rarity,
        status: validatedData.status,
        isSoldOut: validatedData.isSoldOut,
        deliveryType: validatedData.deliveryType,
        categoryId: validatedData.categoryId,
        stats: validatedData.stats,
        images: {
          create: validatedData.images.map((img, index) => ({
            url: img.url,
            alt: img.alt,
            position: index,
          })),
        },
        tags: {
          set: validatedData.tagIds.map((id) => ({ id })),
        },
      },
      include: {
        images: true,
        tags: true,
        category: true,
      },
    })

    await createAuditLog({
      action: "product.update",
      entityType: "Product",
      entityId: product.id,
      description: `Updated product: ${product.name}`,
      userId: session.user.id,
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Product update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Soft delete by archiving
    await prisma.product.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
    })

    await createAuditLog({
      action: "product.delete",
      entityType: "Product",
      entityId: params.id,
      description: `Archived product: ${product.name}`,
      userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Product deletion error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
