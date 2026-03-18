"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

export default function ReportDeathPage() {
  const params = useParams()
  const token = params.token as string
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  const report = async () => {
    setStatus("loading")
    const res = await fetch(`/api/report-death/${token}`, { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      setMessage(data.message)
      setStatus("done")
    } else {
      setMessage(data.error || "Something went wrong.")
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
        {status === "idle" && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-3">Report Death</h1>
            <p className="text-sm text-gray-500 mb-6">
              By clicking the button below, you are reporting that this account's owner may have
              passed away. The account owner will be notified by email and given 3 days to
              respond before any asset information is released.
            </p>
            <button
              onClick={report}
              className="bg-red-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Confirm — Report as Deceased
            </button>
          </>
        )}

        {status === "loading" && (
          <p className="text-gray-500 text-sm">Submitting report...</p>
        )}

        {status === "done" && (
          <>
            <div className="text-green-600 text-3xl mb-3">&#10003;</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Report Submitted</h2>
            <p className="text-sm text-gray-500">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 text-3xl mb-3">&#x26A0;</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-sm text-gray-500">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
