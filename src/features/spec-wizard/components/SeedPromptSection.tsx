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
  const [agentState, setAgentState] = useState<"idle" | "pending" | "success" | "failed">("idle")

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

  const handleRequestAgent = async () => {
    setAgentState("pending")
    try {
      const response = await fetch("/api/request-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, owner, locale })
      })

      if (!response.ok) throw new Error("Request failed")

      setAgentState("success")
      // We don't auto-reset success to idle because we want the user
      // to know it's ready until they potentially reload or something
    } catch (error) {
      console.error(error)
      setAgentState("failed")
      setTimeout(() => setAgentState("idle"), 3000)
    }
  }

  if (!title) return null

  return (
    <div className="panel panel-ai-highlight">
      <h3>{t("seedPrompt.title")}</h3>
      <p>{t("seedPrompt.help")}</p>

      <div className="stack" style={{ gap: "10px" }}>
        <button
          type="button"
          className={copied ? "success" : "secondary"}
          onClick={handleCopy}
          disabled={!title}
        >
          {copied ? t("seedPrompt.button.copied") : t("seedPrompt.button.idle")}
        </button>

        <button
          type="button"
          className={agentState === "success" ? "success" : agentState === "pending" ? "secondary" : "primary"}
          onClick={handleRequestAgent}
          disabled={!title || agentState === "pending"}
        >
          {agentState === "pending"
            ? t("agentDraft.button.pending")
            : agentState === "success"
              ? t("agentDraft.button.success")
              : t("agentDraft.button.idle")}
        </button>
      </div>
    </div>
  )
}

