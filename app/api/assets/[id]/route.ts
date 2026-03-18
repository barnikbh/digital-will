import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const asset = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!asset || asset.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name, type, description, value, notes } = await req.json()
  const updated = await prisma.asset.update({
    where: { id: params.id },
    data: { name, type, description, value, notes },
  })
  return NextResponse.json(updated)
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
