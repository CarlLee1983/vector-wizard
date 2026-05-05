"use client"

import { useState } from "react"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"
import type { MessageKey } from "../i18n/messageKeys"
import { buildSeedPrompt } from "../services/seedPromptBuilder"

type SeedPromptSectionProps = {
  title: string
  owner?: string
}

type AgentState = "idle" | "pending" | "success" | "error"

type DraftRequestResult =
  | { kind: "draft"; draft: unknown }
  | { kind: "parse_error"; raw: string }
  | { kind: "run_error"; message: string }

export function SeedPromptSection({ title, owner }: SeedPromptSectionProps) {
  const { locale, t } = useI18n()
  const { importDraftJson } = useDraftStore()
  const [copied, setCopied] = useState(false)
  const [agentState, setAgentState] = useState<AgentState>("idle")
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null)

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

  const setError = (key: MessageKey) => {
    setAgentState("error")
    setErrorKey(key)
  }

  const handleRequestAgent = async () => {
    setAgentState("pending")
    setErrorKey(null)

    let response: Response
    try {
      response = await fetch("/api/request-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, owner, locale })
      })
    } catch (err) {
      console.error(err)
      setError("agentDraft.error.network")
      return
    }

    if (!response.ok) {
      setError("agentDraft.error.network")
      return
    }

    let result: DraftRequestResult | null = null
    try {
      result = (await response.json()) as DraftRequestResult
    } catch (err) {
      console.error(err)
      setError("agentDraft.error.network")
      return
    }

    if (!result || typeof result !== "object") {
      setError("agentDraft.error.network")
      return
    }
    if (result.kind === "parse_error") {
      setError("agentDraft.error.parse")
      return
    }
    if (result.kind === "run_error") {
      setError("agentDraft.error.run")
      return
    }

    try {
      importDraftJson(JSON.stringify(result.draft))
      setAgentState("success")
      setErrorKey(null)
    } catch (err) {
      console.error(err)
      setError("agentDraft.error.invalidDraft")
    }
  }

  if (!title) return null

  const buttonClass =
    agentState === "success" ? "success" : agentState === "pending" || agentState === "error" ? "secondary" : "primary"

  const buttonLabel =
    agentState === "pending"
      ? t("agentDraft.button.pending")
      : agentState === "success"
        ? t("agentDraft.button.success")
        : agentState === "error"
          ? t("agentDraft.button.failed")
          : t("agentDraft.button.idle")

  return (
    <div className="panel panel-ai-highlight">
      <h3>{t("seedPrompt.title")}</h3>
      <p>{t("seedPrompt.help")}</p>

      <div className="stack" style={{ gap: "10px" }}>
        <button type="button" className={copied ? "success" : "secondary"} onClick={handleCopy} disabled={!title}>
          {copied ? t("seedPrompt.button.copied") : t("seedPrompt.button.idle")}
        </button>

        <button
          type="button"
          className={buttonClass}
          onClick={handleRequestAgent}
          disabled={!title || agentState === "pending"}
        >
          {buttonLabel}
        </button>
      </div>

      {agentState === "error" && errorKey != null && (
        <p role="alert" style={{ color: "var(--danger, #c53030)", marginTop: "8px" }}>
          {t(errorKey)}
        </p>
      )}
    </div>
  )
}
