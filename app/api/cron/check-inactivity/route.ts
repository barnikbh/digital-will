import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendAssetsEmail, sendInactivityWarningEmail } from "@/lib/email"
import { randomBytes } from "crypto"

// Vercel Cron: runs daily at 9am UTC
// vercel.json: { "crons": [{ "path": "/api/cron/check-inactivity", "schedule": "0 9 * * *" }] }

export async function GET(req: Request) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const DAYS_365 = 365 * 24 * 60 * 60 * 1000
  const DAYS_7 = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()

  const users = await prisma.user.findMany({
    include: { assets: true, beneficiaries: true },
  })

  const results: string[] = []

  for (const user of users) {
    const daysSinceLogin = now - user.lastLoginAt.getTime()

    if (daysSinceLogin < DAYS_365) continue
    if (user.beneficiaries.length === 0) continue

    // If we already sent a warning and they still haven't logged in after 7 more days → send assets
    if (user.aliveCheckAt) {
      const daysSinceCheck = now - user.aliveCheckAt.getTime()
      if (daysSinceCheck >= DAYS_7) {
        // Send assets email
        await sendAssetsEmail(user.beneficiaries, user.assets, user.name)
        results.push(`Sent assets email for ${user.email} (365d inactivity + 7d no response)`)
        continue
      }
      // Already sent warning, waiting for response
      results.push(`Waiting for alive response from ${user.email}`)
      continue
    }

    // First time hitting 365 days — send warning email
    const aliveToken = randomBytes(32).toString("hex")
    await prisma.user.update({
      where: { id: user.id },
      data: { aliveToken, aliveCheckAt: new Date() },
    })
    await sendInactivityWarningEmail(user.email, user.name, aliveToken)
    results.push(`Sent inactivity warning to ${user.email}`)
  }

  return NextResponse.json({ processed: users.length, results })
}
