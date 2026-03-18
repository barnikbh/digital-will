import { Resend } from "resend"
import { Asset, Beneficiary } from "@prisma/client"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || "will@yourdomain.com"
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

export async function sendAssetsEmail(
  beneficiaries: Beneficiary[],
  assets: Asset[],
  userName: string
) {
  const assetRows = assets
    .map(
      (a) => `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.name}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.type}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.value || "—"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.description || "—"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.notes || "—"}</td>
      </tr>`
    )
    .join("")

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
      <h2 style="color:#1a1a1a;">Asset Information from ${userName}</h2>
      <p>You are receiving this message because ${userName} has designated you as a beneficiary and the conditions for sharing asset information have been met.</p>
      <h3>Assets</h3>
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
      </table>
      <p style="margin-top:24px;color:#6b7280;font-size:12px;">This is an automated message from the Digital Will system.</p>
    </div>
  `

  const results = await Promise.allSettled(
    beneficiaries.map((b) =>
      resend.emails.send({
        from: FROM_EMAIL,
        to: b.email,
        subject: `Important: Asset information from ${userName}`,
        html,
      })
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
