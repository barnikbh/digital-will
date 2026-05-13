import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendAssetsEmail } from "@/lib/email"
import { decryptAsset } from "@/lib/crypto"

// Vercel Cron: runs daily at 9am UTC
// Checks for pending death reports where the user didn't respond within 3 days

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const DAYS_3 = 3 * 24 * 60 * 60 * 1000
  const cutoff = new Date(Date.now() - DAYS_3)

  // Find pending reports where the confirmation email was sent more than 3 days ago
  const expiredReports = await prisma.deathReport.findMany({
    where: {
      status: "pending",
      confirmEmailSentAt: { lt: cutoff },
    },
    include: {
      user: {
        include: { assets: true, beneficiaries: true },
      },
    },
  })

  const results: string[] = []
  const processedUsers = new Set<string>()

  for (const report of expiredReports) {
    const user = report.user

    // Only send once per user even if multiple reports
    if (processedUsers.has(user.id)) continue
    processedUsers.add(user.id)

    if (user.beneficiaries.length === 0) {
      results.push(`${user.email} has no beneficiaries — skipping`)
      continue
    }

    // Skip if assets were already sent (e.g. inactivity trigger fired first)
    if (user.assetsSentAt) {
      await prisma.deathReport.updateMany({
        where: { userId: user.id, status: "pending" },
        data: { status: "triggered" },
      })
      results.push(`${user.email}: assets already sent, marked reports as triggered`)
      continue
    }

    // Send assets email (decrypt fields before sending)
    await sendAssetsEmail(user.beneficiaries, user.assets.map(decryptAsset), user.name)

    // Mark all pending reports and record when assets were sent
    await Promise.all([
      prisma.deathReport.updateMany({
        where: { userId: user.id, status: "pending" },
        data: { status: "triggered" },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { assetsSentAt: new Date() },
      }),
    ])

    results.push(`Sent assets email for ${user.email} (beneficiary-reported death, no response in 3 days)`)
  }

  return NextResponse.json({
    checked: expiredReports.length,
    triggered: processedUsers.size,
    results,
  })
}
