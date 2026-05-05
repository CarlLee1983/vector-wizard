"use client"

import { useMemo, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { useDraftStore } from "../hooks/useDraftStore"
import { WizardContextProvider } from "../hooks/useWizardContext"
import type { ActionStepId } from "../services/localAgent/actionRegistry"
import { ReviewPanel } from "./ReviewPanel"
import { WizardActionPanel } from "./WizardActionPanel"
import { BasicStep } from "./steps/BasicStep"
import { GoalStep } from "./steps/GoalStep"
import { ContextStep } from "./steps/ContextStep"
import { DeliverablesStep } from "./steps/DeliverablesStep"
import { StoriesStep } from "./steps/StoriesStep"
import { CriteriaStep } from "./steps/CriteriaStep"
import { ExamplesStep } from "./steps/ExamplesStep"
import { BoundariesStep } from "./steps/BoundariesStep"

const steps = [
  "basic",
  "goal",
  "context",
  "deliverables",
  "stories",
  "criteria",
  "examples",
  "boundaries",
  "review"
] as const
// type Step = (typeof steps)[number]

export function Wizard() {
  const { t } = useI18n()
  const { activeDraft, setActiveDraft } = useDraftStore()
  const [stepIndex, setStepIndex] = useState(0)

  const step = steps[stepIndex]

  const content = useMemo(() => {
    if (!activeDraft) return null
    const draft = activeDraft
    const setDraft = setActiveDraft
    const firstEpic = draft.epics[0]
    const firstStory = firstEpic?.stories?.[0]
    if (!firstEpic || !firstStory) {
      return (
        <div className="error-state">
          <p>Draft structure is invalid. Please try creating a new draft or importing a valid JSON.</p>
        </div>
      )
    }

    switch (step) {
      case "basic":
        return <BasicStep draft={draft} setDraft={setDraft} />
      case "goal":
        return <GoalStep draft={draft} setDraft={setDraft} />
      case "context":
        return <ContextStep draft={draft} setDraft={setDraft} />
      case "deliverables":
        return <DeliverablesStep draft={draft} setDraft={setDraft} />
      case "stories":
        return <StoriesStep draft={draft} setDraft={setDraft} />
      case "criteria":
        return <CriteriaStep draft={draft} setDraft={setDraft} />
      case "examples":
        return <ExamplesStep draft={draft} setDraft={setDraft} />
      case "boundaries":
        return <BoundariesStep draft={draft} setDraft={setDraft} />
      case "review":
        return <ReviewPanel draft={draft} />
      default:
        return null
    }
  }, [activeDraft, setActiveDraft, step])

  if (!activeDraft) return null

  const currentStepId: ActionStepId = step === "review" ? "basic" : (step as ActionStepId)

  return (
    <WizardContextProvider currentStepId={currentStepId} activeDraft={activeDraft}>
      <nav className="step-nav">
        {steps.map((s, index) => (
          <div
            key={s}
            className={`step-nav-item ${index === stepIndex ? "active" : ""} ${index < stepIndex ? "completed" : ""}`}
            onClick={() => setStepIndex(index)}
          >
            {String(index + 1).padStart(2, "0")} {t(`step.${s}`)}
          </div>
        ))}
      </nav>

      <div key={step} className="fade-in">
        {content}
      </div>
      <nav className="button-row">
        <button
          className="secondary"
          type="button"
          aria-label={t("wizard.previous")}
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
        >
          ← {t("wizard.previous")}
        </button>
        {stepIndex < steps.length - 1 ? (
          <button
            type="button"
            aria-label={stepIndex === steps.length - 2 ? t("wizard.reviewCta") : t("wizard.next")}
            onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
          >
            {stepIndex === steps.length - 2 ? t("wizard.reviewCta") : t("wizard.next")} →
          </button>
        ) : null}
      </nav>
      <WizardActionPanel />
    </WizardContextProvider>
  )
}
