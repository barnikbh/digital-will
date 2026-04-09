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

type Beneficiary = {
  id: string
  name: string
  email: string
  token: string
}

const ASSET_TYPES = ["bank", "investment", "property", "crypto", "insurance", "vehicle", "other"]

const emptyAsset = { name: "", type: "bank", description: "", value: "", notes: "" }

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [assets, setAssets] = useState<Asset[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)

  // Asset form
  const [assetForm, setAssetForm] = useState(emptyAsset)
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [assetError, setAssetError] = useState("")

  // Beneficiary form
  const [beneForm, setBeneForm] = useState({ name: "", email: "" })
  const [beneError, setBeneError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
    if (status === "authenticated") fetchAll()
  }, [status])

  // Auto-logout when session expires (poll every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === "unauthenticated") router.push("/")
    }, 30000)
    return () => clearInterval(interval)
  }, [status, router])

  const fetchAll = async () => {
    const [a, b] = await Promise.all([
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/beneficiaries").then((r) => r.json()),
    ])
    setAssets(Array.isArray(a) ? a : [])
    setBeneficiaries(Array.isArray(b) ? b : [])
    setLoading(false)
  }

  // Asset actions
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

  // Beneficiary actions
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen">
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
        {/* Assets Section */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingAsset ? "Edit Asset" : "Add Asset"}
          </h2>
          <form
            onSubmit={saveAsset}
            className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label>Asset Name *</label>
                <input
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="e.g. HDFC Savings Account"
                />
              </div>
              <div>
                <label>Type *</label>
                <select
                  value={assetForm.type}
                  onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Value / Amount</label>
                <input
                  value={assetForm.value}
                  onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                  placeholder="e.g. ₹5,00,000 or $10,000"
                />
              </div>
              <div>
                <label>Description</label>
                <input
                  value={assetForm.description}
                  onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                  placeholder="e.g. Account No. 123456, IFSC: HDFC0001"
                />
              </div>
            </div>
            <div>
              <label>Notes / Instructions</label>
              <textarea
                rows={2}
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                placeholder="e.g. Contact branch manager, nomination already done"
              />
            </div>
            {assetError && (
              <p className="text-sm text-red-600">{assetError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                {editingAsset ? "Update Asset" : "Add Asset"}
              </button>
              {editingAsset && (
                <button
                  type="button"
                  onClick={() => { setEditingAsset(null); setAssetForm(emptyAsset) }}
                  className="px-5 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Asset list */}
          {assets.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Your Assets ({assets.length})
              </h3>
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{asset.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {asset.type}
                      </span>
                      {asset.value && (
                        <span className="text-xs text-gray-500">{asset.value}</span>
                      )}
                    </div>
                    {asset.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{asset.description}</p>
                    )}
                    {asset.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{asset.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEditAsset(asset)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {assets.length === 0 && !loading && (
            <p className="text-sm text-gray-400 mt-4">No assets added yet.</p>
          )}
        </section>

        {/* Beneficiaries Section */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Beneficiaries</h2>
          <p className="text-sm text-gray-500 mb-4">
            These people will receive your asset information. Share their unique link so they can
            also trigger the death report.
          </p>

          <form
            onSubmit={addBeneficiary}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label>Name *</label>
                <input
                  required
                  value={beneForm.name}
                  onChange={(e) => setBeneForm({ ...beneForm, name: e.target.value })}
                  placeholder="e.g. Priya Bhattacharyya"
                />
              </div>
              <div>
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={beneForm.email}
                  onChange={(e) => setBeneForm({ ...beneForm, email: e.target.value })}
                  placeholder="priya@example.com"
                />
              </div>
            </div>
            {beneError && <p className="text-sm text-red-600 mt-2">{beneError}</p>}
            <button
              type="submit"
              className="mt-4 bg-gray-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Add Beneficiary
            </button>
          </form>

          {beneficiaries.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Current Beneficiaries ({beneficiaries.length})
              </h3>
              {beneficiaries.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{b.name}</p>
                    <p className="text-sm text-gray-500">{b.email}</p>
                    <p className="text-xs text-gray-400 mt-1 break-all">
                      Death report link:{" "}
                      <span className="font-mono">
                        {process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/report-death/{b.token}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => deleteBeneficiary(b.id)}
                    className="text-xs text-red-500 hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {beneficiaries.length === 0 && !loading && (
            <p className="text-sm text-gray-400 mt-4">No beneficiaries added yet.</p>
          )}
        </section>

        {/* Info box */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          <p className="font-semibold mb-1">How the dead man's switch works</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700">
            <li>
              If you don't log in for <strong>365 days</strong>, you'll receive a warning email.
              If you don't respond within 7 days, assets are sent to all beneficiaries.
            </li>
            <li>
              If a beneficiary emails a death trigger phrase to your configured inbound address,
              you'll receive an "are you alive?" email. If you don't confirm within{" "}
              <strong>3 days</strong>, assets are sent.
            </li>
            <li>
              Logging in at any time resets the clock and dismisses all pending reports.
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}
