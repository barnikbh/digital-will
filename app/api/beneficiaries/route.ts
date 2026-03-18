import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const beneficiaries = await prisma.beneficiary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(beneficiaries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, email } = await req.json()
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
  }

  const beneficiary = await prisma.beneficiary.create({
    data: { userId: session.user.id, name, email },
  })
  return NextResponse.json(beneficiary, { status: 201 })
}
