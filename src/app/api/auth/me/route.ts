import { getSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }
    
    return NextResponse.json({ user: session.user })
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
