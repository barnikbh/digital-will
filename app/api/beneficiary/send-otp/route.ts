import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  // Check if this email belongs to a beneficiary
  const beneficiary = await prisma.beneficiary.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { user: true },
  })

  if (!beneficiary) {
    return NextResponse.json({ error: "No beneficiary found with this email address." }, { status: 404 })
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Delete any existing OTPs for this email
  await prisma.beneficiaryOTP.deleteMany({ where: { email } })

  // Save new OTP
  await prisma.beneficiaryOTP.create({ data: { email, otp, expiresAt } })

  // Send OTP email
  await resend.emails.send({
    from: process.env.FROM_EMAIL || "onboarding@resend.dev",
    to: email,
    subject: "Your Digital Will verification code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;">
        <h2>Verification Code</h2>
        <p>Hi ${beneficiary.name},</p>
        <p>Your one-time code to access the Digital Will is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f3f4f6;border-radius:8px;margin:16px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true, name: beneficiary.name })
}
