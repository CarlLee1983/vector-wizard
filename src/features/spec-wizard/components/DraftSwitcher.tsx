"use client"

import { useState } from "react"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"

type DraftSwitcherProps = {
  onOpenManager: () => void
}

export function DraftSwitcher({ onOpenManager }: DraftSwitcherProps) {
  const { t, locale } = useI18n()
  const { activeDraftId, activeDraft, drafts, selectDraft, createDraft } = useDraftStore()
  const [open, setOpen] = useState(false)

  const currentLabel = activeDraft?.metadata.title?.trim() || t("draftSwitcher.untitled")

  return (
    <div className="draft-switcher" style={{ position: "relative" }}>
      <button type="button" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((v) => !v)}>
        {t("draftSwitcher.label")}：{currentLabel} ▼
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            minWidth: "16rem",
            zIndex: 10
          }}
        >
          {drafts.map((entry) => (
            <button
              key={entry.id}
              role="option"
              aria-selected={entry.id === activeDraftId}
              type="button"
              onClick={() => {
                selectDraft(entry.id)
                setOpen(false)
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "0.5rem"
              }}
            >
              {entry.id === activeDraftId ? "✓ " : "  "}
              {entry.draft.metadata.title?.trim() || t("draftSwitcher.untitled")}
            </button>
          ))}
          <hr />
          <button
            type="button"
            onClick={() => {
              createDraft(locale)
              setOpen(false)
            }}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {t("draftSwitcher.new")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenManager()
            }}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {t("draftSwitcher.manage")}
          </button>
        </div>
      )}
    </div>
  )
}
