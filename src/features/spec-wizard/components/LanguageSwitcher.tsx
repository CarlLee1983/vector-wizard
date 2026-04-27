"use client"

import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"
import type { Locale } from "../model/specTypes"

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const { activeDraft, setActiveDraft } = useDraftStore()

  return (
    <div className="locale-switcher">
      <select
        value={locale}
        onChange={(event) => {
          const next = event.target.value as Locale
          setLocale(next)
          if (activeDraft) {
            setActiveDraft({
              ...activeDraft,
              metadata: { ...activeDraft.metadata, locale: next }
            })
          }
        }}
        aria-label="Change Language"
      >
        <option value="zh-TW">繁體中文</option>
        <option value="en">English</option>
      </select>
    </div>
  )
}
