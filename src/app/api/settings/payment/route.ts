import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.paymentSetting.findFirst()

    if (!settings) {
      return NextResponse.json({
        settings: {
          mode: "MANUAL",
          manualAccounts: [
            { bank: "BCA", accountNumber: "1234567890", accountName: "MpratamaStore" }
          ],
          manualInstructions: "Please transfer to the bank account above and upload your payment proof.",
        },
      })
    }

    // Only expose public-safe fields
    return NextResponse.json({
      settings: {
        mode: settings.mode,
        gatewayProvider: settings.gatewayProvider,
        manualAccounts: settings.manualAccounts,
        manualInstructions: settings.manualInstructions,
        midtransClientKey: settings.midtransClientKey, // Client key is safe to expose
        stripePublishableKey: settings.stripePublishableKey, // Publishable key is safe
      },
    })
  } catch (error) {
    console.error("Payment settings error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 }
    )
  }
}
