"use client"

import { useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { buildSeedPrompt } from "../services/seedPromptBuilder"

type SeedPromptSectionProps = {
  title: string
  owner?: string
}

export function SeedPromptSection({ title, owner }: SeedPromptSectionProps) {
  const { locale, t } = useI18n()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!title) return
    const prompt = buildSeedPrompt({ title, owner, locale })
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  if (!title) return null

  return (
    <div className="panel panel-ai-highlight" style={{ marginTop: "24px" }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "var(--primary)" }}>
        {t("seedPrompt.title")}
      </h3>
      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
        {t("seedPrompt.help")}
      </p>
      <button
        type="button"
        className={copied ? "success" : "secondary"}
        onClick={handleCopy}
        disabled={!title}
        style={{ width: "100%" }}
      >
        {copied ? t("seedPrompt.button.copied") : t("seedPrompt.button.idle")}
      </button>
    </div>
  )
}
