import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { rateLimit, getIP } from "@/lib/rate-limit"

export async function POST(req: Request) {
  // Rate limit: max 10 OTP attempts per IP per 15 minutes (6-digit OTP brute-force protection)
  const ip = getIP(req)
  if (!rateLimit(ip, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes." }, { status: 429 })
  }

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
