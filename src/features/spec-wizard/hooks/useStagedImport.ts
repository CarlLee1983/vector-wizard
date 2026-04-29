"use client"

import { useEffect, useRef, useState } from "react"
import { importDraftJson } from "../persistence/draftStore"

export type StagedImportStatus = "idle" | "running" | "success" | "partial" | "error"

export type UseStagedImportValue = {
  status: StagedImportStatus
  imported: number
  skipped: number
  error: string | null
  dismiss: () => void
}

type StagedDraftEntry = {
  sourcePath: string
  draft: unknown
}

export function useStagedImport(): UseStagedImportValue {
  const [status, setStatus] = useState<StagedImportStatus>("idle")
  const [imported, setImported] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false

    async function run() {
      setStatus("running")
      try {
        const res = await fetch("/api/import-staged", { method: "POST" })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = (await res.json()) as { drafts?: StagedDraftEntry[] }
        const drafts = Array.isArray(data?.drafts) ? data.drafts : []

        if (cancelled) return

        if (drafts.length === 0) {
          setStatus("idle")
          return
        }

        let ok = 0
        let bad = 0
        for (const entry of drafts) {
          try {
            importDraftJson(JSON.stringify(entry.draft))
            ok += 1
          } catch {
            bad += 1
          }
        }

        if (cancelled) return
        setImported(ok)
        setSkipped(bad)
        setStatus(bad === 0 ? "success" : "partial")
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStatus("error")
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  function dismiss() {
    setStatus("idle")
    setImported(0)
    setSkipped(0)
    setError(null)
  }

  return { status, imported, skipped, error, dismiss }
}
