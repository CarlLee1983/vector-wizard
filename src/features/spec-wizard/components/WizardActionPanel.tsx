"use client"

import { useCallback, useState } from "react"
import { ActionMenu } from "./ActionMenu"
import { ActionResultCard } from "./ActionResultCard"
import { useWizardContext } from "../hooks/useWizardContext"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"
import type { ActionResult } from "../services/localAgent/actionResult"

const COLLAPSED_KEY = "vector-wizard:assistant-collapsed"
const STACK_LIMIT = 5

type StackItem = {
  id: number
  result: ActionResult
}

let nextStackId = 1

export function WizardActionPanel() {
  const { t } = useI18n()
  const { currentStepId, activeDraft } = useWizardContext()
  const { applyActionResult } = useDraftStore()
  const [stack, setStack] = useState<StackItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const pushItem = useCallback((result: ActionResult) => {
    setStack((prev) => {
      const next = [...prev, { id: nextStackId++, result }]
      if (next.length > STACK_LIMIT) next.splice(0, next.length - STACK_LIMIT)
      return next
    })
  }, [])

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
        pushItem(json)
      } catch (err) {
        pushItem({
          kind: "run_error",
          actionId,
          message: err instanceof Error ? err.message : String(err)
        })
      } finally {
        setIsRunning(false)
      }
    },
    [activeDraft, pushItem]
  )

  const onAdopt = useCallback(
    (result: ActionResult) => {
      if (result.kind !== "preview") return
      try {
        applyActionResult({
          targetPath: result.preview.targetPath,
          mode: result.preview.mode,
          value: result.preview.text
        })
        setStack((prev) => prev.filter((s) => s.result !== result))
      } catch (err) {
        pushItem({
          kind: "run_error",
          actionId: result.actionId,
          message: err instanceof Error ? err.message : String(err)
        })
      }
    },
    [applyActionResult, pushItem]
  )

  const onDiscard = useCallback((stackId: number) => {
    setStack((prev) => prev.filter((s) => s.id !== stackId))
  }, [])

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
        {stack.map((s) => (
          <ActionResultCard
            key={s.id}
            result={s.result}
            onAdopt={onAdopt}
            onDiscard={() => onDiscard(s.id)}
            onRetry={() => void runRemote(s.result.actionId)}
          />
        ))}
      </div>
    </aside>
  )
}
