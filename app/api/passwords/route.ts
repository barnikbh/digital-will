import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encryptField, decryptAsset } from "@/lib/crypto"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const passwords = await prisma.asset.findMany({
    where: { userId: session.user.id, type: "password" },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(passwords.map(decryptAsset))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, value, notes } = await req.json()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const record = await prisma.asset.create({
    data: {
      userId: session.user.id,
      type: "password",
      name: encryptField(name) ?? name,
      description: encryptField(description), // username / email
      value: encryptField(value),             // password
      notes: encryptField(notes),             // URL or extra notes
    },
  })
  return NextResponse.json(decryptAsset(record), { status: 201 })
}
