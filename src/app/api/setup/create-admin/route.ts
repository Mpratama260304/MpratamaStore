import { NextResponse } from "next/server"
import { getPrismaClient, isDbEnabled } from "@/lib/db"
import * as argon2 from "argon2"
import { z } from "zod"

// Force dynamic
export const dynamic = 'force-dynamic'

// Validation schema
const createAdminSchema = z.object({
  email: z.string().email("Email tidak valid"),
  username: z.string().min(3, "Username minimal 3 karakter").max(50, "Username maksimal 50 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

/**
 * POST /api/setup/create-admin
 * 
 * Creates the first admin user during initial setup.
 * This endpoint can only be used if no admin user exists.
 * 
 * Body:
 * - email: string (required, valid email)
 * - username: string (required, min 3 chars)
 * - password: string (required, min 6 chars)
 * 
 * Returns:
 * - 200: Admin created successfully
 * - 400: Validation error
 * - 409: Admin already exists
 * - 500: Server error
 */
export async function POST(request: Request) {
  try {
    // Check if database is enabled
    if (!isDbEnabled()) {
      return NextResponse.json({
        ok: false,
        error: "Database not configured"
      }, { status: 500 })
    }

    const client = getPrismaClient()
    if (!client) {
      return NextResponse.json({
        ok: false,
        error: "Database client not available"
      }, { status: 500 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        ok: false,
        error: "Invalid JSON body"
      }, { status: 400 })
    }

    const validation = createAdminSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        ok: false,
        error: "Validation failed",
        details: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }, { status: 400 })
    }

    const { email, username, password } = validation.data

    // Check if admin already exists
    try {
      const existingAdminCount = await client.user.count({
        where: { role: "ADMIN" }
      })

      if (existingAdminCount > 0) {
        return NextResponse.json({
          ok: false,
          error: "Setup sudah selesai. Admin sudah ada, silakan login."
        }, { status: 409 })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      
      // If table doesn't exist, return appropriate error
      if (message.includes('no such table') || 
          message.includes('does not exist') ||
          message.includes('P2021')) {
        return NextResponse.json({
          ok: false,
          error: "Database schema belum siap. Jalankan migration terlebih dahulu."
        }, { status: 500 })
      }
      throw error
    }

    // Check if email or username already taken
    const existingUser = await client.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json({
        ok: false,
        error: existingUser.email === email.toLowerCase() 
          ? "Email sudah digunakan"
          : "Username sudah digunakan"
      }, { status: 409 })
    }

    // Hash password (NEVER log the password!)
    const passwordHash = await argon2.hash(password)

    // Create admin user
    const adminUser = await client.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        firstName: "Admin",
        lastName: "",
        emailVerified: new Date(),
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      }
    })

    console.log(`[Setup] Admin user created: ${adminUser.email}`)

    // Create essential settings if they don't exist
    try {
      await client.siteSetting.upsert({
        where: { id: 'site-settings' },
        update: {},
        create: {
          id: 'site-settings',
          siteTitle: 'MpratamaStore',
          siteTagline: 'Fantasy Digital Market — Claim Your Rewards',
          siteDescription: 'Toko produk digital bertema fantasy',
          maintenanceMode: false,
          storeNotice: '🎮 Welcome to the Fantasy Market!',
        }
      })

      await client.seoSetting.upsert({
        where: { id: 'seo-settings' },
        update: {},
        create: {
          id: 'seo-settings',
          defaultMetaTitle: 'MpratamaStore - Fantasy Digital Market',
          defaultMetaDescription: 'Toko produk digital bertema fantasy',
          robotsIndex: true,
          robotsFollow: true,
          generateSitemap: true,
        }
      })

      await client.paymentSetting.upsert({
        where: { id: 'payment-settings' },
        update: {},
        create: {
          id: 'payment-settings',
          mode: 'BOTH',
          manualAccounts: JSON.stringify([
            { bank: 'BCA', accountNumber: '1234567890', accountName: 'MpratamaStore' },
          ]),
          manualInstructions: 'Transfer sesuai total pesanan.',
        }
      })
    } catch (settingsError) {
      // Log but don't fail - admin was created successfully
      console.error('[Setup] Settings creation error:', settingsError)
    }

    return NextResponse.json({
      ok: true,
      message: "Admin berhasil dibuat",
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
      }
    })

  } catch (error) {
    console.error('[Setup Create Admin] Error:', error)
    return NextResponse.json({
      ok: false,
      error: "Gagal membuat admin. Silakan coba lagi."
    }, { status: 500 })
  }
}
