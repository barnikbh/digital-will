"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

type BeneficiaryResult = {
  name: string
  ownerName: string
  token: string
}

export default function Home() {
  const router = useRouter()
  const [view, setView] = useState<"choose" | "beneficiary" | "owner">("choose")

  // Beneficiary flow state
  const [bEmail, setBEmail] = useState("")
  const [bOTP, setBOTP] = useState("")
  const [bStep, setBStep] = useState<"email" | "otp" | "done">("email")
  const [bResult, setBResult] = useState<BeneficiaryResult | null>(null)
  const [bName, setBName] = useState("")
  const [bLoading, setBLoading] = useState(false)
  const [bError, setBError] = useState("")

  // Owner login state
  const [form, setForm] = useState({ email: "", password: "" })
  const [oError, setOError] = useState("")
  const [oLoading, setOLoading] = useState(false)
  const [userExists, setUserExists] = useState(true)

  useEffect(() => {
    fetch("/api/user-exists").then((r) => r.json()).then((d) => setUserExists(d.exists))
  }, [])

  // Beneficiary: send OTP
  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setBLoading(true)
    setBError("")
    const res = await fetch("/api/beneficiary/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: bEmail }),
    })
    const data = await res.json()
    setBLoading(false)
    if (!res.ok) { setBError(data.error); return }
    setBName(data.name)
    setBStep("otp")
  }

  // Beneficiary: verify OTP
  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setBLoading(true)
    setBError("")
    const res = await fetch("/api/beneficiary/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: bEmail, otp: bOTP }),
    })
    const data = await res.json()
    setBLoading(false)
    if (!res.ok) { setBError(data.error); return }
    setBResult(data)
    setBStep("done")
  }

  // Owner: sign in
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setOLoading(true)
    setOError("")
    const res = await signIn("credentials", { ...form, redirect: false })
    setOLoading(false)
    if (res?.error) { setOError("Invalid email or password"); return }
    router.push("/dashboard")
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")

  // ── Choose view ──────────────────────────────────────────────
  if (view === "choose") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Digital Will</h1>
          <p className="text-gray-500 mt-2 text-sm">Who are you?</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setView("beneficiary")}
            className="w-full bg-gray-900 text-white py-4 rounded-xl text-base font-medium hover:bg-gray-700 transition-colors"
          >
            I am a beneficiary
          </button>

          <button
            onClick={() => setView("owner")}
            className="w-full bg-white border border-gray-200 text-gray-500 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            I am the account owner
          </button>
        </div>
      </div>
    )
  }

  // ── Beneficiary flow ─────────────────────────────────────────
  if (view === "beneficiary") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md">
          <button onClick={() => setView("choose")} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
            ← Back
          </button>

          <div className="bg-white border border-gray-200 rounded-xl p-8">
            {bStep === "email" && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Beneficiary Access</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Enter the email address that was registered as a beneficiary. We'll send you a one-time code to verify your identity.
                </p>
                <form onSubmit={sendOTP} className="space-y-4">
                  <div>
                    <label>Your Email Address</label>
                    <input
                      type="email"
                      required
                      value={bEmail}
                      onChange={(e) => setBEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  {bError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{bError}</p>}
                  <button
                    type="submit"
                    disabled={bLoading}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {bLoading ? "Sending..." : "Send Verification Code"}
                  </button>
                </form>
              </>
            )}

            {bStep === "otp" && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Enter your code</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Hi <strong>{bName}</strong> — we sent a 6-digit code to <strong>{bEmail}</strong>. It expires in 10 minutes.
                </p>
                <form onSubmit={verifyOTP} className="space-y-4">
                  <div>
                    <label>6-Digit Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={bOTP}
                      onChange={(e) => setBOTP(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="text-center text-2xl tracking-widest"
                    />
                  </div>
                  {bError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{bError}</p>}
                  <button
                    type="submit"
                    disabled={bLoading || bOTP.length !== 6}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {bLoading ? "Verifying..." : "Verify"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBStep("email"); setBOTP(""); setBError("") }}
                    className="w-full text-sm text-gray-400 hover:text-gray-600"
                  >
                    Resend code
                  </button>
                </form>
              </>
            )}

            {bStep === "done" && bResult && (
              <>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">✓</div>
                  <h2 className="text-xl font-bold text-gray-900">Verified, {bResult.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    You are a registered beneficiary of <strong>{bResult.ownerName}</strong>'s Digital Will.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 text-sm text-amber-800">
                  <p className="font-semibold">What you can do</p>
                  <ul className="list-disc list-inside space-y-2 text-amber-700">
                    <li>
                      If <strong>{bResult.ownerName}</strong> has passed away, use the link below to report it. You will need to confirm, after which {bResult.ownerName} will receive an alert to verify they're alive.
                    </li>
                    <li>
                      If {bResult.ownerName} does not respond within <strong>3 days</strong>, their asset information will be sent to all beneficiaries.
                    </li>
                    <li>
                      Save this page or bookmark your personal link below.
                    </li>
                  </ul>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your personal report link</p>
                  <div className="bg-gray-100 rounded-lg px-4 py-3 font-mono text-xs break-all text-gray-700">
                    {appUrl}/report-death/{bResult.token}
                  </div>
                  <a
                    href={`${appUrl}/report-death/${bResult.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 w-full inline-block text-center bg-red-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Report {bResult.ownerName} as deceased
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Owner login ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <button onClick={() => setView("choose")} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
          ← Back
        </button>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Account Owner Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            {oError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{oError}</p>}
            <button
              type="submit"
              disabled={oLoading}
              className="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {oLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
