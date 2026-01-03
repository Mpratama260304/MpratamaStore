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

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    
    const body = await request.json()
    const validatedData = productSchema.parse(body)

    // Check if slug exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug: validatedData.slug },
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

    const product = await prisma.product.create({
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
          connect: validatedData.tagIds.map((id) => ({ id })),
        },
      },
      include: {
        images: true,
        tags: true,
        category: true,
      },
    })

    await createAuditLog({
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      description: `Created product: ${product.name}`,
      userId: session.user.id,
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error("Product creation error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Products fetch error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
