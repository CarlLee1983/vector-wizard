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
    <div className="draft-switcher">
      <button
        className="secondary"
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        {t("draftSwitcher.label")}：{currentLabel} ▼
      </button>
      {open && (
        <div className="dropdown-menu" role="listbox">
          {drafts.map((entry) => (
            <button
              key={entry.id}
              className={`dropdown-item ${entry.id === activeDraftId ? "active" : ""}`}
              role="option"
              aria-selected={entry.id === activeDraftId}
              type="button"
              onClick={() => {
                selectDraft(entry.id)
                setOpen(false)
              }}
            >
              {entry.id === activeDraftId ? "✓ " : "  "}
              {entry.draft.metadata.title?.trim() || t("draftSwitcher.untitled")}
            </button>
          ))}
          <div className="dropdown-divider" />
          <button
            className="dropdown-item"
            type="button"
            onClick={() => {
              createDraft(locale)
              setOpen(false)
            }}
          >
            + {t("draftSwitcher.new")}
          </button>
          <button
            className="dropdown-item"
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenManager()
            }}
          >
            ⚙ {t("draftSwitcher.manage")}
          </button>
        </div>
      )}
    </div>

  )
}
