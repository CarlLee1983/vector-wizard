"use client"

import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"

export function EmptyDraftState() {
  const { t, locale } = useI18n()
  const { createDraft } = useDraftStore()

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        padding: "3rem 1rem",
        textAlign: "center"
      }}
    >
      <h2>{t("empty.title")}</h2>
      <p>{t("empty.subtitle")}</p>
      <button type="button" onClick={() => createDraft(locale)}>
        {t("empty.cta")}
      </button>
    </section>
  )
}
