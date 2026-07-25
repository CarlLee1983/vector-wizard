"use client"

import { useCallback, useState } from "react"
import { ActionMenu } from "./ActionMenu"
import { ActionResultCard } from "./ActionResultCard"
import { useWizardContext } from "../hooks/useWizardContext"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"
import { recordSuggestionOutcome } from "../persistence/suggestionLog"
import type { ActionResult } from "../services/localAgent/actionResult"

const COLLAPSED_KEY = "vector-wizard:assistant-collapsed"

export function WizardActionPanel() {
  const { t } = useI18n()
  const { currentStepId, activeDraft, assistantStack, pushAssistantItem, removeAssistantItem } = useWizardContext()
  const { applyActionResult } = useDraftStore()
  const [isRunning, setIsRunning] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const runRemote = useCallback(
    async (actionId: string) => {
      if (!activeDraft) return
      setIsRunning(true)
      try {
        const res = await fetch("/api/wizard-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionId, draft: activeDraft })
        })
        const json = (await res.json()) as ActionResult
        pushAssistantItem(json)
      } catch (err) {
        pushAssistantItem({
          kind: "run_error",
          actionId,
          message: err instanceof Error ? err.message : String(err)
        })
      } finally {
        setIsRunning(false)
      }
    },
    [activeDraft, pushAssistantItem]
  )

  const onAdopt = useCallback(
    (stackId: number, result: ActionResult) => {
      if (result.kind !== "preview" && result.kind !== "assist") return
      try {
        const value = result.kind === "preview" ? result.preview.text : result.suggestedText
        const targetPath = result.kind === "preview" ? result.preview.targetPath : result.targetPath
        const mode = result.kind === "preview" ? result.preview.mode : "replace"

        if (value !== undefined) {
          applyActionResult({
            targetPath,
            mode,
            value
          })
        }
        // 只在成功套用之後才記為採用——若 applyActionResult 丟錯，建議仍留在堆疊
        // 供重試，那就不算被採用。只有帶 suggestionId 的 assist 建議進校準分母。
        if (result.kind === "assist" && result.suggestionId) {
          recordSuggestionOutcome(result.suggestionId, "adopted")
        }
        removeAssistantItem(stackId)
      } catch (err) {
        pushAssistantItem({
          kind: "run_error",
          actionId: result.actionId,
          message: err instanceof Error ? err.message : String(err)
        })
      }
    },
    [applyActionResult, pushAssistantItem, removeAssistantItem]
  )

  const onDiscard = useCallback(
    (stackId: number, result: ActionResult) => {
      // 丟棄一則可採納的 rewrite 建議 = 拒絕，是校準的負樣本。quality_check 與
      // wizard action preview 沒有 suggestionId，不進分母（它們是「關閉」而非「拒絕」）。
      if (result.kind === "assist" && result.suggestionId) {
        recordSuggestionOutcome(result.suggestionId, "rejected")
      }
      removeAssistantItem(stackId)
    },
    [removeAssistantItem]
  )

  if (collapsed) {
    return (
      <button
        type="button"
        className="assistant-toggle"
        onClick={() => {
          setCollapsed(false)
          if (typeof window !== "undefined") window.localStorage.setItem(COLLAPSED_KEY, "0")
        }}
      >
        ✦ {t("actionPanel.title")}
      </button>
    )
  }

  return (
    <aside className="assistant-panel action-panel" aria-label={t("actionPanel.title")}>
      <header className="action-panel__header">
        <h2>{t("actionPanel.title")}</h2>
        <button
          type="button"
          onClick={() => {
            setCollapsed(true)
            if (typeof window !== "undefined") window.localStorage.setItem(COLLAPSED_KEY, "1")
          }}
        >
          —
        </button>
      </header>
      <ActionMenu step={currentStepId} onRun={runRemote} isRunning={isRunning} />
      {isRunning ? <p>{t("actionPanel.running")}</p> : null}
      <div className="action-panel__stack">
        {assistantStack.map((s) => (
          <ActionResultCard
            key={s.id}
            result={s.result}
            onAdopt={() => onAdopt(s.id, s.result)}
            onDiscard={() => onDiscard(s.id, s.result)}
            onRetry={() => void runRemote(s.result.actionId)}
          />
        ))}
      </div>
    </aside>
  )
}
