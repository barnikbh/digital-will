"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

type Asset = {
  id: string
  name: string
  type: string
  description: string | null
  value: string | null
  notes: string | null
}

type Password = {
  id: string
  name: string        // service name
  description: string | null  // username/email
  value: string | null        // password
  notes: string | null        // URL or notes
}

type Beneficiary = {
  id: string
  name: string
  email: string
  token: string
}

const ASSET_TYPES = ["bank", "investment", "property", "crypto", "insurance", "vehicle", "other"]
const emptyAsset = { name: "", type: "bank", description: "", value: "", notes: "" }
const emptyPassword = { name: "", description: "", value: "", notes: "" }

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputCls = "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
const labelCls = "block text-xs font-medium text-gray-600 mb-1"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [assets, setAssets] = useState<Asset[]>([])
  const [passwords, setPasswords] = useState<Password[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)

  // Asset form
  const [assetForm, setAssetForm] = useState(emptyAsset)
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [assetError, setAssetError] = useState("")

  // Password form
  const [passwordForm, setPasswordForm] = useState(emptyPassword)
  const [editingPassword, setEditingPassword] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState("")
  const [showPasswordValue, setShowPasswordValue] = useState<Record<string, boolean>>({})

  // Beneficiary form
  const [beneForm, setBeneForm] = useState({ name: "", email: "" })
  const [beneError, setBeneError] = useState("")

  // Test email
  const [testEmail, setTestEmail] = useState("")
  const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
    if (status === "authenticated") fetchAll()
  }, [status])

  useEffect(() => {
    const interval = setInterval(() => {
      if (status === "unauthenticated") router.push("/")
    }, 30000)
    return () => clearInterval(interval)
  }, [status, router])

  const fetchAll = async () => {
    const [a, p, b] = await Promise.all([
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/passwords").then((r) => r.json()),
      fetch("/api/beneficiaries").then((r) => r.json()),
    ])
    setAssets(Array.isArray(a) ? a : [])
    setPasswords(Array.isArray(p) ? p : [])
    setBeneficiaries(Array.isArray(b) ? b : [])
    setLoading(false)
  }

  // ─── Asset actions ──────────────────────────────────────────────────────────
  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssetError("")
    const method = editingAsset ? "PUT" : "POST"
    const url = editingAsset ? `/api/assets/${editingAsset}` : "/api/assets"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assetForm),
    })
    if (!res.ok) {
      const d = await res.json()
      setAssetError(d.error || "Failed to save")
      return
    }
    setAssetForm(emptyAsset)
    setEditingAsset(null)
    fetchAll()
  }

  const deleteAsset = async (id: string) => {
    if (!confirm("Delete this asset?")) return
    await fetch(`/api/assets/${id}`, { method: "DELETE" })
    fetchAll()
  }

  const startEditAsset = (asset: Asset) => {
    setEditingAsset(asset.id)
    setAssetForm({
      name: asset.name,
      type: asset.type,
      description: asset.description || "",
      value: asset.value || "",
      notes: asset.notes || "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ─── Password actions ───────────────────────────────────────────────────────
  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    const method = editingPassword ? "PUT" : "POST"
    const url = editingPassword ? `/api/passwords/${editingPassword}` : "/api/passwords"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwordForm),
    })
    if (!res.ok) {
      const d = await res.json()
      setPasswordError(d.error || "Failed to save")
      return
    }
    setPasswordForm(emptyPassword)
    setEditingPassword(null)
    fetchAll()
  }

  const deletePassword = async (id: string) => {
    if (!confirm("Delete this password?")) return
    await fetch(`/api/passwords/${id}`, { method: "DELETE" })
    fetchAll()
  }

  const startEditPassword = (p: Password) => {
    setEditingPassword(p.id)
    setPasswordForm({
      name: p.name,
      description: p.description || "",
      value: p.value || "",
      notes: p.notes || "",
    })
  }

  // ─── Beneficiary actions ────────────────────────────────────────────────────
  const addBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault()
    setBeneError("")
    const res = await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(beneForm),
    })
    if (!res.ok) {
      const d = await res.json()
      setBeneError(d.error || "Failed to add")
      return
    }
    setBeneForm({ name: "", email: "" })
    fetchAll()
  }

  const deleteBeneficiary = async (id: string) => {
    if (!confirm("Remove this beneficiary?")) return
    await fetch(`/api/beneficiaries/${id}`, { method: "DELETE" })
    fetchAll()
  }

  // ─── Test email ─────────────────────────────────────────────────────────────
  const sendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestEmailStatus("sending")
    const res = await fetch("/api/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    })
    setTestEmailStatus(res.ok ? "sent" : "error")
    if (res.ok) setTimeout(() => setTestEmailStatus("idle"), 4000)
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Digital Will</h1>
          <p className="text-xs text-gray-400">Signed in as {session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {/* ── Assets ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingAsset ? "Edit Asset" : "Add Asset"}
          </h2>
          <form onSubmit={saveAsset} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Asset Name *</label>
                <input className={inputCls} required value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="e.g. HDFC Savings Account" />
              </div>
              <div>
                <label className={labelCls}>Type *</label>
                <select className={inputCls} value={assetForm.type}
                  onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}>
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Value / Amount</label>
                <input className={inputCls} value={assetForm.value}
                  onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                  placeholder="e.g. ₹5,00,000" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={assetForm.description}
                  onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                  placeholder="e.g. Account No. 123456" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notes / Instructions</label>
              <textarea className={inputCls} rows={2} value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                placeholder="e.g. Contact branch manager, nomination already done" />
            </div>
            {assetError && <p className="text-sm text-red-600">{assetError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
                {editingAsset ? "Update Asset" : "Add Asset"}
              </button>
              {editingAsset && (
                <button type="button"
                  onClick={() => { setEditingAsset(null); setAssetForm(emptyAsset) }}
                  className="px-5 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {assets.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Your Assets ({assets.length})
              </h3>
              {assets.map((asset) => (
                <div key={asset.id} className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{asset.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{asset.type}</span>
                      {asset.value && <span className="text-xs text-gray-500">{asset.value}</span>}
                    </div>
                    {asset.description && <p className="text-sm text-gray-500 mt-1 truncate">{asset.description}</p>}
                    {asset.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{asset.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditAsset(asset)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => deleteAsset(asset.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {assets.length === 0 && <p className="text-sm text-gray-400 mt-4">No assets added yet.</p>}
        </section>

        {/* ── Passwords ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {editingPassword ? "Edit Password" : "Add Password"}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Passwords are encrypted at rest and included in the beneficiary email.
          </p>
          <form onSubmit={savePassword} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Service / Site Name *</label>
                <input className={inputCls} required value={passwordForm.name}
                  onChange={(e) => setPasswordForm({ ...passwordForm, name: e.target.value })}
                  placeholder="e.g. Gmail, HDFC NetBanking" />
              </div>
              <div>
                <label className={labelCls}>Username / Email</label>
                <input className={inputCls} value={passwordForm.description}
                  onChange={(e) => setPasswordForm({ ...passwordForm, description: e.target.value })}
                  placeholder="e.g. barnikbh@gmail.com" />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input className={inputCls} value={passwordForm.value}
                  onChange={(e) => setPasswordForm({ ...passwordForm, value: e.target.value })}
                  placeholder="Password" />
              </div>
              <div>
                <label className={labelCls}>URL / Notes</label>
                <input className={inputCls} value={passwordForm.notes}
                  onChange={(e) => setPasswordForm({ ...passwordForm, notes: e.target.value })}
                  placeholder="e.g. https://netbanking.hdfcbank.com" />
              </div>
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
                {editingPassword ? "Update Password" : "Add Password"}
              </button>
              {editingPassword && (
                <button type="button"
                  onClick={() => { setEditingPassword(null); setPasswordForm(emptyPassword) }}
                  className="px-5 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {passwords.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Saved Passwords ({passwords.length})
              </h3>
              {passwords.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                    {p.value && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-gray-700">
                          {showPasswordValue[p.id] ? p.value : "•".repeat(Math.min(p.value.length, 16))}
                        </p>
                        <button
                          onClick={() => setShowPasswordValue((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          {showPasswordValue[p.id] ? "hide" : "show"}
                        </button>
                      </div>
                    )}
                    {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditPassword(p)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => deletePassword(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {passwords.length === 0 && <p className="text-sm text-gray-400 mt-4">No passwords saved yet.</p>}
        </section>

        {/* ── Beneficiaries ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Beneficiaries</h2>
          <p className="text-sm text-gray-500 mb-4">
            These people will receive your assets and passwords. Share their unique link so they can also trigger the death report.
          </p>
          <form onSubmit={addBeneficiary} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} required value={beneForm.name}
                  onChange={(e) => setBeneForm({ ...beneForm, name: e.target.value })}
                  placeholder="e.g. Priya Bhattacharyya" />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input className={inputCls} type="email" required value={beneForm.email}
                  onChange={(e) => setBeneForm({ ...beneForm, email: e.target.value })}
                  placeholder="priya@example.com" />
              </div>
            </div>
            {beneError && <p className="text-sm text-red-600 mt-2">{beneError}</p>}
            <button type="submit" className="mt-4 bg-gray-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors">
              Add Beneficiary
            </button>
          </form>

          {beneficiaries.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Current Beneficiaries ({beneficiaries.length})
              </h3>
              {beneficiaries.map((b) => (
                <div key={b.id} className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <p className="text-sm text-gray-500">{b.email}</p>
                    <p className="text-xs text-gray-400 mt-1 break-all">
                      Death report link:{" "}
                      <span className="font-mono">
                        {process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")}/report-death/{b.token}
                      </span>
                    </p>
                  </div>
                  <button onClick={() => deleteBeneficiary(b.id)} className="text-xs text-red-500 hover:underline shrink-0">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {beneficiaries.length === 0 && <p className="text-sm text-gray-400 mt-4">No beneficiaries added yet.</p>}
        </section>

        {/* ── Test Email ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Test Email</h2>
          <p className="text-sm text-gray-500 mb-4">
            Preview the exact email your beneficiaries would receive — sent to any address you choose. No death event is triggered.
          </p>
          <form onSubmit={sendTestEmail} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className={labelCls}>Send preview to</label>
                <input className={inputCls} type="email" required value={testEmail}
                  onChange={(e) => { setTestEmail(e.target.value); setTestEmailStatus("idle") }}
                  placeholder="barnikbh@gmail.com" />
              </div>
              <button
                type="submit"
                disabled={testEmailStatus === "sending"}
                className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {testEmailStatus === "sending" ? "Sending..." : "Send test"}
              </button>
            </div>
            {testEmailStatus === "sent" && (
              <p className="text-sm text-green-600 mt-3">Test email sent — check your inbox.</p>
            )}
            {testEmailStatus === "error" && (
              <p className="text-sm text-red-600 mt-3">Failed to send. Check your Resend config.</p>
            )}
          </form>
        </section>

        {/* ── Info box ── */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          <p className="font-semibold mb-1">How the dead man's switch works</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700">
            <li>If you don't log in for <strong>365 days</strong>, you'll receive a warning email. If you don't respond within 7 days, assets are sent to all beneficiaries.</li>
            <li>If a beneficiary reports your death via their unique link, you'll receive an "are you alive?" email. If you don't confirm within <strong>3 days</strong>, assets are sent.</li>
            <li>Logging in at any time resets the clock and dismisses all pending reports.</li>
          </ul>
        </section>

      </main>
    </div>
  )
}
