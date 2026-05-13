import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encryptField, decryptAsset } from "@/lib/crypto"

const VALID_TYPES = ["bank", "investment", "property", "crypto", "insurance", "vehicle", "other", "password"]

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const asset = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!asset || asset.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name, type, description, value, notes } = await req.json()
  if (type && !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid asset type" }, { status: 400 })
  }

  const updated = await prisma.asset.update({
    where: { id: params.id },
    data: {
      name: encryptField(name) ?? name,
      type,
      description: encryptField(description),
      value: encryptField(value),
      notes: encryptField(notes),
    },
  })
  return NextResponse.json(decryptAsset(updated))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const asset = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!asset || asset.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.asset.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
