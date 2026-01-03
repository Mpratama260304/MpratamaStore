import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  try {
    await requireAdmin()

    const settings = await prisma.paymentSetting.findFirst()

    // Don't expose sensitive keys
    if (settings) {
      return NextResponse.json({
        settings: {
          ...settings,
          midtransServerKey: settings.midtransServerKey ? "••••••••" : "",
          midtransClientKey: settings.midtransClientKey ? "••••••••" : "",
          stripeSecretKey: settings.stripeSecretKey ? "••••••••" : "",
          stripeWebhookSecret: settings.stripeWebhookSecret ? "••••••••" : "",
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Payment settings fetch error:", error)
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
      mode,
      gatewayProvider,
      manualAccounts,
      manualInstructions,
      midtransServerKey,
      midtransClientKey,
      midtransIsProduction,
      stripeSecretKey,
      stripePublishableKey,
      stripeWebhookSecret,
    } = body

    let settings = await prisma.paymentSetting.findFirst()

    const updateData: Record<string, unknown> = {
      mode,
      gatewayProvider,
      manualAccounts,
      manualInstructions,
      midtransIsProduction,
      stripePublishableKey,
    }

    // Only update keys if they're not masked
    if (midtransServerKey && !midtransServerKey.includes("•")) {
      updateData.midtransServerKey = midtransServerKey
    }
    if (midtransClientKey && !midtransClientKey.includes("•")) {
      updateData.midtransClientKey = midtransClientKey
    }
    if (stripeSecretKey && !stripeSecretKey.includes("•")) {
      updateData.stripeSecretKey = stripeSecretKey
    }
    if (stripeWebhookSecret && !stripeWebhookSecret.includes("•")) {
      updateData.stripeWebhookSecret = stripeWebhookSecret
    }

    if (settings) {
      settings = await prisma.paymentSetting.update({
        where: { id: settings.id },
        data: updateData,
      })
    } else {
      settings = await prisma.paymentSetting.create({
        data: {
          mode: mode || "BOTH",
          gatewayProvider: gatewayProvider || null,
          manualAccounts: manualAccounts || [],
          manualInstructions: manualInstructions || "",
          midtransServerKey: midtransServerKey || null,
          midtransClientKey: midtransClientKey || null,
          midtransIsProduction: midtransIsProduction || false,
          stripeSecretKey: stripeSecretKey || null,
          stripePublishableKey: stripePublishableKey || null,
          stripeWebhookSecret: stripeWebhookSecret || null,
        },
      })
    }

    await createAuditLog({
      action: "settings.payment.update",
      entityType: "PaymentSetting",
      entityId: settings.id,
      description: "Payment settings updated",
      userId: session.user.id,
    })

    return NextResponse.json({
      settings: {
        ...settings,
        midtransServerKey: settings.midtransServerKey ? "••••••••" : "",
        midtransClientKey: settings.midtransClientKey ? "••••••••" : "",
        stripeSecretKey: settings.stripeSecretKey ? "••••••••" : "",
        stripeWebhookSecret: settings.stripeWebhookSecret ? "••••••••" : "",
      },
    })
  } catch (error) {
    console.error("Payment settings update error:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
