import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"

const tagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { name, slug } = tagSchema.parse(body)

    const existingTag = await prisma.tag.findFirst({
      where: { slug, NOT: { id: params.id } },
    })

    if (existingTag) {
      return NextResponse.json(
        { error: "A tag with this slug already exists" },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: { name, slug },
    })

    await createAuditLog({
      action: "tag.update",
      entityType: "Tag",
      entityId: tag.id,
      description: `Updated tag: ${tag.name}`,
      userId: session.user.id,
    })

    return NextResponse.json({ tag })
  } catch (error) {
    console.error("Tag update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const tag = await prisma.tag.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: true } } },
    })

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    if (tag._count.products > 0) {
      return NextResponse.json(
        { error: "Cannot delete tag with existing products" },
        { status: 400 }
      )
    }

    await prisma.tag.delete({
      where: { id: params.id },
    })

    await createAuditLog({
      action: "tag.delete",
      entityType: "Tag",
      entityId: params.id,
      description: `Deleted tag: ${tag.name}`,
      userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Tag deletion error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 })
  }
}
