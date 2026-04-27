"use client"

import { useState } from "react"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"

export function AutosaveErrorToast() {
  const { t } = useI18n()
  const { lastWriteError } = useDraftStore()
  const [dismissed, setDismissed] = useState(false)

  if (!lastWriteError || dismissed) return null

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        background: "#fee",
        border: "1px solid #c33",
        padding: "0.75rem 1rem",
        zIndex: 50
      }}
    >
      <span>{t("autosave.error")}</span>
      <button type="button" onClick={() => setDismissed(true)} style={{ marginLeft: "0.75rem" }}>
        {t("autosave.dismiss")}
      </button>
    </div>
  )
}
