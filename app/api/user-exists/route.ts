import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const count = await prisma.user.count()
  return NextResponse.json({ exists: count > 0 })
}
