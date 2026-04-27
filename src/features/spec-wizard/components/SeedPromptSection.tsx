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
    <div className="ai-seed-section">
      <h3>{t("seedPrompt.title")}</h3>
      <p>{t("seedPrompt.help")}</p>
      <button
        type="button"
        className={copied ? "success" : "secondary"}
        onClick={handleCopy}
        disabled={!title}
      >
        {copied ? t("seedPrompt.button.copied") : t("seedPrompt.button.idle")}
      </button>

      <style jsx>{`
        .ai-seed-section {
          margin-top: 24px;
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          border-left: 4px solid var(--primary);
        }
        h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: var(--primary);
        }
        p {
          margin: 0 0 16px 0;
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }
        button {
          width: 100%;
          justify-content: center;
        }
        button.success {
          background: #4caf50;
          color: white;
          border-color: #4caf50;
        }
      `}</style>
    </div>
  )
}
