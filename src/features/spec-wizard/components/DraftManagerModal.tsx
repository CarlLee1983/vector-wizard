"use client"

import { useEffect, useRef, useState } from "react"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"
import type { DraftId } from "../model/specTypes"
import { ConfirmDialog } from "./ConfirmDialog"

type DraftManagerModalProps = {
  open: boolean
  onClose: () => void
}

export function DraftManagerModal({ open, onClose }: DraftManagerModalProps) {
  const { t, locale } = useI18n()
  const { drafts, createDraft, renameDraft, deleteDraft, importDraftJson, exportDraftJson } = useDraftStore()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<DraftId | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      importDraftJson(text)
      setImportError(null)
    } catch {
      setImportError(t("draftManager.importError"))
    } finally {
      event.target.value = ""
    }
  }

  function handleExport(id: DraftId) {
    const json = exportDraftJson(id)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `draft-${id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} aria-labelledby="dm-title">
      <h2 id="dm-title">{t("draftManager.title")}</h2>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button type="button" onClick={() => createDraft(locale)}>
          {t("draftSwitcher.new")}
        </button>
        <label>
          {t("draftManager.import")}
          <input type="file" accept="application/json" onChange={handleImport} style={{ marginLeft: "0.5rem" }} />
        </label>
      </div>

      {importError && <p role="alert">{importError}</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {drafts.map((entry) => (
          <li
            key={entry.id}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              padding: "0.5rem 0",
              borderBottom: "1px solid #eee"
            }}
          >
            <input
              type="text"
              defaultValue={entry.draft.metadata.title}
              onBlur={(e) => renameDraft(entry.id, e.target.value)}
              aria-label={t("draftManager.rename")}
              style={{ flex: 1 }}
            />
            <small>
              {entry.draft.metadata.locale} · {t("draftManager.updatedAt")}: {new Date(entry.meta.updatedAt).toLocaleString()}
            </small>
            <button type="button" onClick={() => handleExport(entry.id)}>
              {t("draftManager.export")}
            </button>
            <button type="button" onClick={() => setPendingDeleteId(entry.id)}>
              {t("draftManager.delete")}
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button type="button" aria-label={t("draftManager.title")} onClick={onClose}>
          {t("confirm.cancel")}
        </button>
      </div>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title={t("confirm.deleteDraft.title")}
        message={t("confirm.deleteDraft.message")}
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={() => {
          if (pendingDeleteId) deleteDraft(pendingDeleteId)
          setPendingDeleteId(null)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </dialog>
  )
}
