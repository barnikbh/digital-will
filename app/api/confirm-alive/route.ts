import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { aliveToken: token } })
  if (!user) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center;">
        <h2>Invalid or expired link</h2>
        <p>This confirmation link is no longer valid. Please log in to your account directly.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    )
  }

  // Mark user as alive — reset all death-trigger state
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), aliveToken: null, aliveCheckAt: null, assetsSentAt: null },
  })

  // Dismiss pending death reports
  await prisma.deathReport.updateMany({
    where: { userId: user.id, status: "pending" },
    data: { status: "dismissed" },
  })

  return new NextResponse(
    `<html><body style="font-family:sans-serif;max-width:500px;margin:60px auto;text-align:center;">
      <h2 style="color:#16a34a;">Confirmed!</h2>
      <p>You have been marked as alive. All pending death reports have been dismissed.</p>
      <p><a href="${process.env.NEXTAUTH_URL}">Go to your account</a></p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  )
}
