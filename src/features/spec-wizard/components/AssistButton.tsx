"use client"

import { useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import type { AssistRequest, AssistResponse } from "../services/assistService"

type AssistButtonProps = {
  mode: "rewrite" | "quality_check"
  text: string
  onApply: (suggestedText: string) => void
}

export function AssistButton({ mode, text, onApply }: AssistButtonProps) {
  const { t, locale } = useI18n()
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")

  async function handleAssist() {
    if (!text.trim()) return
    
    setStatus("loading")
    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          locale,
          text
        } as AssistRequest)
      })

      if (!response.ok) throw new Error("Assist failed")
      
      const data: AssistResponse = await response.json()
      if (data.suggestedText) {
        onApply(data.suggestedText)
        setStatus("done")
        setTimeout(() => setStatus("idle"), 2000)
      } else {
        setStatus("idle")
      }
    } catch (error) {
      console.error(error)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  const label = 
    status === "loading" ? t("wizard.aiAssisting") :
    status === "done" ? t("wizard.aiAssistDone") :
    t("wizard.aiAssist")

  return (
    <button 
      type="button" 
      className="ai-assist-button secondary"
      disabled={status === "loading" || !text.trim()}
      onClick={handleAssist}
    >
      {label}
    </button>
  )
}
