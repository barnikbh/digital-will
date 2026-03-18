import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, type, description, value, notes } = await req.json()
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
  }

  const asset = await prisma.asset.create({
    data: { userId: session.user.id, name, type, description, value, notes },
  })
  return NextResponse.json(asset, { status: 201 })
}
