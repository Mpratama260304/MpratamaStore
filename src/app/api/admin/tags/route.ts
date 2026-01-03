import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"

const tagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { name, slug } = tagSchema.parse(body)

    const existingTag = await prisma.tag.findUnique({
      where: { slug },
    })

    if (existingTag) {
      return NextResponse.json(
        { error: "A tag with this slug already exists" },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: { name, slug },
    })

    await createAuditLog({
      action: "tag.create",
      entityType: "Tag",
      entityId: tag.id,
      description: `Created tag: ${tag.name}`,
      userId: session.user.id,
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error("Tag creation error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error("Tags fetch error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 })
  }
}
