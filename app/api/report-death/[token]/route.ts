import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendAliveCheckEmail } from "@/lib/email"
import { randomBytes } from "crypto"

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { token: params.token },
    include: { user: true },
  })

  if (!beneficiary) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 })
  }

  const user = beneficiary.user

  // Don't create duplicate pending reports from the same beneficiary
  const existing = await prisma.deathReport.findFirst({
    where: { beneficiaryId: beneficiary.id, status: "pending" },
  })
  if (existing) {
    return NextResponse.json({ message: "Report already received. The account owner has been notified." })
  }

  // Generate alive token and save it
  const aliveToken = randomBytes(32).toString("hex")
  await prisma.user.update({
    where: { id: user.id },
    data: { aliveToken, aliveCheckAt: new Date() },
  })

  // Create death report
  const report = await prisma.deathReport.create({
    data: {
      userId: user.id,
      beneficiaryId: beneficiary.id,
      confirmEmailSentAt: new Date(),
    },
  })

  // Send alive check email to user
  await sendAliveCheckEmail(user.email, user.name, aliveToken, beneficiary.name)

  return NextResponse.json({
    message: "Report received. The account owner has been notified and must confirm within 3 days.",
    reportId: report.id,
  })
}
