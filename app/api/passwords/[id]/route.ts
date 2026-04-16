import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encryptField, decryptAsset } from "@/lib/crypto"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const record = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!record || record.userId !== session.user.id || record.type !== "password") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name, description, value, notes } = await req.json()
  const updated = await prisma.asset.update({
    where: { id: params.id },
    data: {
      name: encryptField(name) ?? name,
      type: "password",
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

  const record = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!record || record.userId !== session.user.id || record.type !== "password") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.asset.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
