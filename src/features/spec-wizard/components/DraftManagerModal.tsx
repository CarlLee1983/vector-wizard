"use client"

import { useEffect, useRef, useState } from "react"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"
import type { DraftId } from "../model/specTypes"
import { YamlParseError } from "../services/yamlParser"
import { ConfirmDialog } from "./ConfirmDialog"

type DraftManagerModalProps = {
  open: boolean
  onClose: () => void
}

export function DraftManagerModal({ open, onClose }: DraftManagerModalProps) {
  const { t, locale } = useI18n()
  const { drafts, createDraft, renameDraft, deleteDraft, importDraftJson, importDraftYaml, exportDraftJson } = useDraftStore()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<DraftId | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [yamlImportError, setYamlImportError] = useState<{ line: number; reason: string } | null>(null)
  const [isPasting, setIsPasting] = useState(false)

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

  async function handleImportYaml(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      importDraftYaml(text)
      setYamlImportError(null)
      setImportError(null)
    } catch (err) {
      if (err instanceof YamlParseError) {
        setYamlImportError({ line: err.line, reason: err.message })
      } else {
        setYamlImportError({ line: 0, reason: (err as Error).message })
      }
    } finally {
      event.target.value = ""
    }
  }

  function tryImportText(text: string): boolean {
    try {
      JSON.parse(text)
      importDraftJson(text)
      setImportError(null)
      setYamlImportError(null)
      return true
    } catch {
      // fall through to YAML
    }
    try {
      importDraftYaml(text)
      setImportError(null)
      setYamlImportError(null)
      return true
    } catch (err) {
      if (err instanceof YamlParseError) {
        setYamlImportError({ line: err.line, reason: err.message })
      } else {
        setImportError(t("draftManager.importError"))
      }
      return false
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
        <label className="secondary-button" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
          {t("draftManager.import")}
          <input type="file" accept="application/json" onChange={handleImport} style={{ display: "none" }} />
        </label>
        <label className="secondary-button" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
          {t("draftManager.importYaml")}
          <input
            type="file"
            accept=".yaml,.yml,text/yaml,text/plain"
            onChange={handleImportYaml}
            aria-label={t("draftManager.importYaml")}
            style={{ display: "none" }}
          />
        </label>
        <button type="button" className="secondary" onClick={() => setIsPasting(!isPasting)}>
          {t("draftManager.paste")}
        </button>
      </div>

      {isPasting && (
        <div className="stack" style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f1f5f9", borderRadius: "12px" }}>
          <p style={{ fontSize: "0.85rem", margin: 0, color: "#64748b" }}>{t("draftManager.detectFormat")}</p>
          <textarea
            autoFocus
            placeholder={t("draftManager.pasteYamlPlaceholder")}
            style={{ minHeight: "120px", fontSize: "0.9rem", fontFamily: "monospace" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                const target = e.target as HTMLTextAreaElement
                if (target.value && tryImportText(target.value)) {
                  setIsPasting(false)
                }
              }
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={(e) => {
                const wrapper = e.currentTarget.closest(".stack") as HTMLElement | null
                const textarea = wrapper?.querySelector("textarea") as HTMLTextAreaElement | null
                if (textarea && textarea.value && tryImportText(textarea.value)) {
                  setIsPasting(false)
                }
              }}
            >
              {t("draftManager.pasteSubmit")}
            </button>
          </div>
        </div>
      )}

      {importError && <p role="alert" className="error" style={{ marginBottom: "1rem" }}>{importError}</p>}
      {yamlImportError && (
        <p role="alert" className="error" style={{ marginBottom: "1rem" }}>
          {t("draftManager.importYamlError")
            .replace("{line}", String(yamlImportError.line))
            .replace("{reason}", yamlImportError.reason)}
        </p>
      )}

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
