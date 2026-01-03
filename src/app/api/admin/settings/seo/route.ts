import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"

const seoSchema = z.object({
  siteTitle: z.string().optional(),
  siteDescription: z.string().optional(),
  keywords: z.string().optional(),
  ogImage: z.string().optional(),
  twitterHandle: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  googleSiteVerification: z.string().optional(),
})

export async function GET() {
  try {
    await requireAdmin()

    const seoSettings = await prisma.seoSetting.findFirst()

    return NextResponse.json({
      settings: seoSettings || {
        siteTitle: "",
        siteDescription: "",
        keywords: "",
        ogImage: "",
        twitterHandle: "",
        googleAnalyticsId: "",
        googleSiteVerification: "",
      },
    })
  } catch (error) {
    console.error("SEO settings fetch error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to fetch SEO settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const data = seoSchema.parse(body)

    const existingSeo = await prisma.seoSetting.findFirst()

    let seoSettings
    if (existingSeo) {
      seoSettings = await prisma.seoSetting.update({
        where: { id: existingSeo.id },
        data,
      })
    } else {
      seoSettings = await prisma.seoSetting.create({
        data,
      })
    }

    await createAuditLog({
      action: "settings.seo.update",
      entityType: "SeoSetting",
      entityId: seoSettings.id,
      description: "Updated SEO settings",
      userId: session.user.id,
    })

    return NextResponse.json({ settings: seoSettings })
  } catch (error) {
    console.error("SEO settings update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to update SEO settings" }, { status: 500 })
  }
}
