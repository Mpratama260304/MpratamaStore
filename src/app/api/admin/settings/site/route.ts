import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  try {
    await requireAdmin()

    const settings = await prisma.siteSetting.findFirst()

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Site settings fetch error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const {
      siteTitle,
      siteTagline,
      siteDescription,
      logoLight,
      logoDark,
      favicon,
      ogImageDefault,
      maintenanceMode,
      storeNotice,
      primaryColor,
      accentColor,
    } = body

    let settings = await prisma.siteSetting.findFirst()

    if (settings) {
      settings = await prisma.siteSetting.update({
        where: { id: settings.id },
        data: {
          siteTitle,
          siteTagline,
          siteDescription,
          logoLight,
          logoDark,
          favicon,
          ogImageDefault,
          maintenanceMode,
          storeNotice,
          primaryColor,
          accentColor,
        },
      })
    } else {
      settings = await prisma.siteSetting.create({
        data: {
          siteTitle,
          siteTagline,
          siteDescription,
          logoLight,
          logoDark,
          favicon,
          ogImageDefault,
          maintenanceMode,
          storeNotice,
          primaryColor,
          accentColor,
        },
      })
    }

    await createAuditLog({
      action: "settings.site.update",
      entityType: "SiteSetting",
      entityId: settings.id,
      description: "Site settings updated",
      userId: session.user.id,
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Site settings update error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
