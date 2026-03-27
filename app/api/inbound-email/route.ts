import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendAliveCheckEmail } from "@/lib/email"
import { randomBytes } from "crypto"

// Mailgun inbound email webhook
// Configure Mailgun to POST to: https://your-domain.com/api/inbound-email
// with the route filter matching your designated inbox address

export async function POST(req: Request) {
  // Verify the request is from Mailgun using the signing key (mandatory)
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration: INBOUND_WEBHOOK_SECRET not set" }, { status: 500 })
  }
  const authHeader = req.headers.get("x-inbound-secret")
  if (authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, string>
  const contentType = req.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    body = await req.json()
  } else {
    // Mailgun sends form-encoded data
    const formData = await req.formData()
    body = {}
    formData.forEach((val, key) => {
      body[key] = val.toString()
    })
  }

  const subject = (body["subject"] || "").toLowerCase()
  const bodyText = (body["body-plain"] || body["stripped-text"] || body["text"] || "").toLowerCase()
  const combined = subject + " " + bodyText

  // Check if the email contains the death trigger phrase
  const TRIGGER_PHRASES = ["barnik is dead", "barnik has died", "barnik passed away"]
  const triggered = TRIGGER_PHRASES.some((phrase) => combined.includes(phrase))

  if (!triggered) {
    return NextResponse.json({ message: "Email received but no trigger phrase detected" })
  }

  // Find the user (there's only one account owner in this app)
  const user = await prisma.user.findFirst({
    include: { beneficiaries: true },
  })

  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 })
  }

  // Try to identify which beneficiary sent this
  const senderEmail = (body["sender"] || body["from"] || "").toLowerCase()
  const beneficiary = user.beneficiaries.find((b) =>
    senderEmail.includes(b.email.toLowerCase())
  )

  // Avoid duplicate pending reports
  const existingPending = await prisma.deathReport.findFirst({
    where: { userId: user.id, status: "pending" },
  })

  if (existingPending) {
    return NextResponse.json({ message: "Already have a pending report" })
  }

  // Generate alive token
  const aliveToken = randomBytes(32).toString("hex")
  await prisma.user.update({
    where: { id: user.id },
    data: { aliveToken, aliveCheckAt: new Date() },
  })

  // Create a death report (with or without a matched beneficiary)
  if (beneficiary) {
    await prisma.deathReport.create({
      data: {
        userId: user.id,
        beneficiaryId: beneficiary.id,
        confirmEmailSentAt: new Date(),
      },
    })
    await sendAliveCheckEmail(user.email, user.name, aliveToken, beneficiary.name)
  } else {
    // Sender not in beneficiary list — still trigger the alert
    await sendAliveCheckEmail(user.email, user.name, aliveToken, "an unknown sender")
  }

  return NextResponse.json({ message: "Death report processed. User notified." })
}
