import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encryptField, decryptAsset } from "@/lib/crypto"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(assets.map(decryptAsset))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, type, description, value, notes } = await req.json()
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
  }

  const asset = await prisma.asset.create({
    data: {
      userId: session.user.id,
      name: encryptField(name) ?? name,
      type,
      description: encryptField(description),
      value: encryptField(value),
      notes: encryptField(notes),
    },
  })
  return NextResponse.json(decryptAsset(asset), { status: 201 })
}
