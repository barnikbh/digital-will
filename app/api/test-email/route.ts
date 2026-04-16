import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { decryptAsset } from "@/lib/crypto"
import { sendAssetsEmail } from "@/lib/email"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { email } = await req.json()
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 })
  }

  const [assets, beneficiaries] = await Promise.all([
    prisma.asset.findMany({ where: { userId: session.user.id } }),
    prisma.beneficiary.findMany({ where: { userId: session.user.id } }),
  ])

  const decryptedAssets = assets.map(decryptAsset)

  await sendAssetsEmail(beneficiaries, decryptedAssets, session.user.name ?? "Unknown", email)

  return NextResponse.json({ ok: true })
}
