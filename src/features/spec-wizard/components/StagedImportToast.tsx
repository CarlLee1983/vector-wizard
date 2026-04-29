"use client"

import { useStagedImport } from "../hooks/useStagedImport"
import { useI18n } from "../i18n/I18nContext"

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""))
}

export function StagedImportToast() {
  const { t } = useI18n()
  const { status, imported, skipped, error, dismiss } = useStagedImport()

  if (status === "idle" || status === "running") return null

  let message: string
  let role: "status" | "alert" = "status"
  if (status === "success") {
    message = imported === 1 ? t("stagedImport.success") : format(t("stagedImport.successPlural"), { count: imported })
  } else if (status === "partial") {
    message = format(t("stagedImport.partial"), { imported, skipped })
    role = "alert"
  } else {
    message = format(t("stagedImport.error"), { reason: error ?? "unknown" })
    role = "alert"
  }

  return (
    <div
      role={role}
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        background: status === "error" ? "#fee2e2" : "#dcfce7",
        color: "#0f172a",
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        display: "flex",
        gap: "0.75rem",
        alignItems: "center"
      }}
    >
      <span>{message}</span>
      <button type="button" onClick={dismiss} aria-label={t("stagedImport.dismiss")}>
        {t("stagedImport.dismiss")}
      </button>
    </div>
  )
}
