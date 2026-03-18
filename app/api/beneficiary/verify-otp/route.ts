import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  const { email, otp } = await req.json()
  if (!email || !otp) return NextResponse.json({ error: "Email and OTP required" }, { status: 400 })

  const record = await prisma.beneficiaryOTP.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  })

  if (!record) return NextResponse.json({ error: "No OTP found. Please request a new code." }, { status: 400 })
  if (new Date() > record.expiresAt) return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 })
  if (record.otp !== otp) return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 })

  // Valid — clean up OTP
  await prisma.beneficiaryOTP.deleteMany({ where: { email } })

  // Return beneficiary info
  const beneficiary = await prisma.beneficiary.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { user: { select: { name: true } } },
  })

  return NextResponse.json({
    name: beneficiary!.name,
    ownerName: beneficiary!.user.name,
    token: beneficiary!.token,
  })
}
