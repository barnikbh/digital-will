import { Resend } from "resend"
import { Asset, Beneficiary } from "@prisma/client"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || "will@yourdomain.com"
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

export async function sendAssetsEmail(
  beneficiaries: Beneficiary[],
  assets: Asset[],
  userName: string,
  testEmail?: string // if provided, send only to this address with [TEST] prefix
) {
  const financialAssets = assets.filter((a) => a.type !== "password")
  const passwords = assets.filter((a) => a.type === "password")

  const assetRows = financialAssets
    .map(
      (a) => `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.name}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-transform:capitalize;">${a.type}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.value || "—"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.description || "—"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.notes || "—"}</td>
      </tr>`
    )
    .join("")

  const passwordRows = passwords
    .map(
      (p) => `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${p.name}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${p.description || "—"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace;">${p.value || "—"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${p.notes || "—"}</td>
      </tr>`
    )
    .join("")

  const passwordsSection = passwords.length > 0 ? `
    <h3 style="margin-top:32px;">Passwords & Accounts</h3>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Service / Site</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Username / Email</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Password</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Notes / URL</th>
        </tr>
      </thead>
      <tbody>${passwordRows}</tbody>
    </table>` : ""

  const testBanner = testEmail ? `
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
      <strong style="color:#92400e;">⚠ This is a test email.</strong>
      <span style="color:#78350f;"> No death event has occurred. This was sent manually to preview what your beneficiaries would receive.</span>
    </div>` : ""

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
      ${testBanner}
      <h2 style="color:#1a1a1a;">Asset Information from ${userName}</h2>
      <p>You are receiving this message because ${userName} has designated you as a beneficiary and the conditions for sharing asset information have been met.</p>
      ${financialAssets.length > 0 ? `
      <h3>Financial Assets</h3>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Name</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Type</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Value</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Description</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Notes</th>
          </tr>
        </thead>
        <tbody>${assetRows}</tbody>
      </table>` : ""}
      ${passwordsSection}
      <p style="margin-top:24px;color:#6b7280;font-size:12px;">This is an automated message from the Digital Will system.</p>
    </div>
  `

  const subject = testEmail
    ? `[TEST] Asset information from ${userName}`
    : `Important: Asset information from ${userName}`

  const recipients = testEmail ? [testEmail] : beneficiaries.map((b) => b.email)

  const results = await Promise.allSettled(
    recipients.map((to) =>
      resend.emails.send({ from: FROM_EMAIL, to, subject, html })
    )
  )

  return results
}

export async function sendAliveCheckEmail(
  userEmail: string,
  userName: string,
  aliveToken: string,
  reporterName: string
) {
  const confirmUrl = `${APP_URL}/api/confirm-alive?token=${aliveToken}`

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
      <h2>Are you okay, ${userName}?</h2>
      <p>One of your beneficiaries (<strong>${reporterName}</strong>) has reported that you may have passed away.</p>
      <p>If you are alive and well, please click the button below to confirm. If you do not respond within <strong>3 days</strong>, your asset information will automatically be sent to all your beneficiaries.</p>
      <a href="${confirmUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
        I am alive — confirm here
      </a>
      <p style="margin-top:24px;color:#6b7280;font-size:12px;">Alternatively, simply log in to your Digital Will account to dismiss this alert.</p>
    </div>
  `

  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "Action required: Confirm you are alive",
    html,
  })
}

export async function sendInactivityWarningEmail(
  userEmail: string,
  userName: string,
  aliveToken: string
) {
  const confirmUrl = `${APP_URL}/api/confirm-alive?token=${aliveToken}`

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
      <h2>Digital Will — Inactivity Alert</h2>
      <p>Hi ${userName},</p>
      <p>You have not logged into your Digital Will account in over 365 days. Your asset information will be sent to your beneficiaries unless you confirm you are alive by logging in.</p>
      <a href="${confirmUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
        I am alive — confirm here
      </a>
      <p style="margin-top:24px;color:#6b7280;font-size:12px;">This is an automated message from the Digital Will system.</p>
    </div>
  `

  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "Digital Will: You have been inactive for 365 days",
    html,
  })
}
