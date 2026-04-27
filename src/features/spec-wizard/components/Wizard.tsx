"use client"

import { useEffect, useMemo, useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { createEmptyDraft } from "../model/defaultDraft"
import type { FeatureDraft } from "../model/specTypes"
import { draftFromJson, loadDraft, saveDraft } from "../persistence/draftStorage"
import { FieldArray } from "./FieldArray"
import { ReviewPanel } from "./ReviewPanel"
import { WizardStep } from "./WizardStep"

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
type Step = (typeof steps)[number]

function updateFirstEpic(draft: FeatureDraft, patch: Partial<FeatureDraft["epics"][number]>): FeatureDraft {
  return {
    ...draft,
    epics: draft.epics.map((epic, epicIndex) => (epicIndex === 0 ? { ...epic, ...patch } : epic))
  }
}

function updateStory(
  draft: FeatureDraft,
  patch: Partial<FeatureDraft["epics"][number]["stories"][number]>
): FeatureDraft {
  return {
    ...draft,
    epics: draft.epics.map((epic, epicIndex) =>
      epicIndex === 0
        ? {
            ...epic,
            stories: epic.stories.map((story, storyIndex) => (storyIndex === 0 ? { ...story, ...patch } : story))
          }
        : epic
    )
  }
}

export function Wizard() {
  const { locale, setLocale, t } = useI18n()
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<FeatureDraft>(() => createEmptyDraft(locale))

  useEffect(() => {
    const stored = loadDraft()
    if (stored) setDraft(stored)
  }, [])

  useEffect(() => {
    saveDraft(draft)
  }, [draft])

  const step = steps[stepIndex]
  const firstEpic = draft.epics[0]
  const firstStory = firstEpic.stories[0]

  const content = useMemo(() => {
    if (step === "basic") {
      return (
        <WizardStep title="基本資訊">
          <div className="field">
            <label htmlFor="title">{t("field.title")}</label>
            <small id="title-help">{t("field.titleHelp")}</small>
            <input
              id="title"
              aria-describedby="title-help"
              placeholder={t("field.titlePlaceholder")}
              value={draft.metadata.title}
              onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, title: event.target.value } })}
            />
          </div>
          <div className="field">
            <label htmlFor="owner">{t("field.owner")}</label>
            <small id="owner-help">{t("field.ownerHelp")}</small>
            <input
              id="owner"
              aria-describedby="owner-help"
              placeholder={t("field.ownerPlaceholder")}
              value={draft.metadata.owner}
              onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, owner: event.target.value } })}
            />
          </div>
          <div className="field">
            <label htmlFor="draftImport">{t("wizard.importDraft")}</label>
            <input
              id="draftImport"
              type="file"
              accept="application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setDraft(draftFromJson(await file.text()))
              }}
            />
          </div>
        </WizardStep>
      )
    }

    if (step === "goal") {
      return (
        <WizardStep title="目標與影響" method="Impact Mapping">
          <div className="field">
            <label htmlFor="problem">{t("field.problem")}</label>
            <small id="problem-help">{t("field.problemHelp")}</small>
            <textarea
              id="problem"
              aria-describedby="problem-help"
              placeholder={t("field.problemPlaceholder")}
              value={draft.summary.problem}
              onChange={(event) => setDraft({ ...draft, summary: { ...draft.summary, problem: event.target.value } })}
            />
          </div>
          <div className="field">
            <label htmlFor="desiredOutcome">{t("field.desiredOutcome")}</label>
            <small id="desired-outcome-help">{t("field.desiredOutcomeHelp")}</small>
            <textarea
              id="desiredOutcome"
              aria-describedby="desired-outcome-help"
              placeholder={t("field.desiredOutcomePlaceholder")}
              value={draft.summary.desiredOutcome}
              onChange={(event) =>
                setDraft({ ...draft, summary: { ...draft.summary, desiredOutcome: event.target.value } })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="goal">{t("field.goal")}</label>
            <small id="goal-help">{t("field.goalHelp")}</small>
            <textarea
              id="goal"
              aria-describedby="goal-help"
              placeholder={t("field.goalPlaceholder")}
              value={draft.goal.statement}
              onChange={(event) => setDraft({ ...draft, goal: { ...draft.goal, statement: event.target.value } })}
            />
          </div>
          <FieldArray
            label={t("field.successSignals")}
            help={t("field.successSignalsHelp")}
            helpId="success-signals-help"
            placeholder={t("field.successSignalsPlaceholder")}
            values={draft.goal.successSignals}
            onChange={(successSignals) => setDraft({ ...draft, goal: { ...draft.goal, successSignals } })}
          />
        </WizardStep>
      )
    }

    if (step === "context") {
      const firstImpact = draft.impacts[0] ?? { id: "IM-001", actor: "", impact: "" }
      const firstActivity = draft.userActivities[0] ?? { id: "UA-001", actor: "", activity: "" }

      return (
        <WizardStep title="影響與活動" method="Impact Mapping">
          <div className="field">
            <label htmlFor="impactActor">{t("field.impactActor")}</label>
            <small id="impact-actor-help">{t("field.impactActorHelp")}</small>
            <input
              id="impactActor"
              aria-describedby="impact-actor-help"
              placeholder={t("field.impactActorPlaceholder")}
              value={firstImpact.actor}
              onChange={(event) => setDraft({ ...draft, impacts: [{ ...firstImpact, actor: event.target.value }] })}
            />
          </div>
          <div className="field">
            <label htmlFor="impact">{t("field.impact")}</label>
            <small id="impact-help">{t("field.impactHelp")}</small>
            <textarea
              id="impact"
              aria-describedby="impact-help"
              placeholder={t("field.impactPlaceholder")}
              value={firstImpact.impact}
              onChange={(event) => setDraft({ ...draft, impacts: [{ ...firstImpact, impact: event.target.value }] })}
            />
          </div>
          <div className="field">
            <label htmlFor="userActivityActor">{t("field.userActivityActor")}</label>
            <small id="user-activity-actor-help">{t("field.userActivityActorHelp")}</small>
            <input
              id="userActivityActor"
              aria-describedby="user-activity-actor-help"
              placeholder={t("field.userActivityActorPlaceholder")}
              value={firstActivity.actor}
              onChange={(event) =>
                setDraft({ ...draft, userActivities: [{ ...firstActivity, actor: event.target.value }] })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="userActivity">{t("field.userActivity")}</label>
            <small id="user-activity-help">{t("field.userActivityHelp")}</small>
            <textarea
              id="userActivity"
              aria-describedby="user-activity-help"
              placeholder={t("field.userActivityPlaceholder")}
              value={firstActivity.activity}
              onChange={(event) =>
                setDraft({ ...draft, userActivities: [{ ...firstActivity, activity: event.target.value }] })
              }
            />
          </div>
        </WizardStep>
      )
    }

    if (step === "deliverables") {
      const firstDeliverable = draft.deliverables[0] ?? { id: "DE-001", name: "", description: "" }

      return (
        <WizardStep title="交付項目" method="Story Mapping">
          <div className="field">
            <label htmlFor="deliverableName">{t("field.deliverableName")}</label>
            <small id="deliverable-name-help">{t("field.deliverableNameHelp")}</small>
            <input
              id="deliverableName"
              aria-describedby="deliverable-name-help"
              placeholder={t("field.deliverableNamePlaceholder")}
              value={firstDeliverable.name}
              onChange={(event) =>
                setDraft({ ...draft, deliverables: [{ ...firstDeliverable, name: event.target.value }] })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="deliverableDescription">{t("field.deliverableDescription")}</label>
            <small id="deliverable-description-help">{t("field.deliverableDescriptionHelp")}</small>
            <textarea
              id="deliverableDescription"
              aria-describedby="deliverable-description-help"
              placeholder={t("field.deliverableDescriptionPlaceholder")}
              value={firstDeliverable.description}
              onChange={(event) =>
                setDraft({ ...draft, deliverables: [{ ...firstDeliverable, description: event.target.value }] })
              }
            />
          </div>
        </WizardStep>
      )
    }

    if (step === "stories") {
      return (
        <WizardStep title="使用者故事" method="Story Mapping">
          <div className="field">
            <label htmlFor="epicTitle">{t("field.epicTitle")}</label>
            <small id="epic-title-help">{t("field.epicTitleHelp")}</small>
            <input
              id="epicTitle"
              aria-describedby="epic-title-help"
              placeholder={t("field.epicTitlePlaceholder")}
              value={firstEpic.title}
              onChange={(event) => setDraft(updateFirstEpic(draft, { title: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="storyTitle">{t("field.storyTitle")}</label>
            <small id="story-title-help">{t("field.storyTitleHelp")}</small>
            <input
              id="storyTitle"
              aria-describedby="story-title-help"
              placeholder={t("field.storyTitlePlaceholder")}
              value={firstStory.title}
              onChange={(event) => setDraft(updateStory(draft, { title: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="userStory">{t("field.userStory")}</label>
            <small id="user-story-help">{t("field.userStoryHelp")}</small>
            <textarea
              id="userStory"
              aria-describedby="user-story-help"
              placeholder={t("field.userStoryPlaceholder")}
              value={firstStory.userStory}
              onChange={(event) => setDraft(updateStory(draft, { userStory: event.target.value }))}
            />
          </div>
        </WizardStep>
      )
    }

    if (step === "criteria") {
      return (
        <WizardStep title="驗收條件" method="Specification by Example">
          <FieldArray
            label={t("field.acceptanceCriteria")}
            help={t("field.acceptanceCriteriaHelp")}
            helpId="acceptance-criteria-help"
            placeholder={t("field.acceptanceCriteriaPlaceholder")}
            values={firstStory.acceptanceCriteria.map((criterion) => criterion.statement)}
            onChange={(statements) =>
              setDraft(
                updateStory(draft, {
                  acceptanceCriteria: statements.map((statement, index) => ({
                    id: `AC-${String(index + 1).padStart(3, "0")}`,
                    statement
                  }))
                })
              )
            }
          />
        </WizardStep>
      )
    }

    if (step === "examples") {
      const firstExample = firstStory.examples[0] ?? { id: "EX-001", format: "natural-language" as const, scenario: "" }

      return (
        <WizardStep title="範例情境" method="Specification by Example">
          <div className="field">
            <label htmlFor="exampleScenario">{t("field.exampleScenario")}</label>
            <small id="example-scenario-help">{t("field.exampleScenarioHelp")}</small>
            <textarea
              id="exampleScenario"
              aria-describedby="example-scenario-help"
              placeholder={t("field.exampleScenarioPlaceholder")}
              value={firstExample.scenario ?? ""}
              onChange={(event) =>
                setDraft(
                  updateStory(draft, {
                    examples: [{ ...firstExample, scenario: event.target.value }]
                  })
                )
              }
            />
          </div>
        </WizardStep>
      )
    }

    if (step === "boundaries") {
      return (
        <WizardStep title="限制、非目標與風險">
          <div className="field">
            <label htmlFor="constraints">{t("field.constraints")}</label>
            <small id="constraints-help">{t("field.constraintsHelp")}</small>
            <textarea
              id="constraints"
              aria-describedby="constraints-help"
              placeholder={t("field.constraintsPlaceholder")}
              value={draft.agentBoundaries.constraints[0] ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, constraints: [event.target.value] } })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="nonGoals">{t("field.nonGoals")}</label>
            <small id="non-goals-help">{t("field.nonGoalsHelp")}</small>
            <textarea
              id="nonGoals"
              aria-describedby="non-goals-help"
              placeholder={t("field.nonGoalsPlaceholder")}
              value={draft.agentBoundaries.nonGoals[0] ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, nonGoals: [event.target.value] } })
              }
            />
          </div>
          <FieldArray
            label={t("field.testExpectations")}
            help={t("field.testExpectationsHelp")}
            helpId="test-expectations-help"
            placeholder={t("field.testExpectationsPlaceholder")}
            values={draft.agentBoundaries.testExpectations}
            onChange={(testExpectations) =>
              setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, testExpectations } })
            }
          />
        </WizardStep>
      )
    }

    if (step === "review") return <ReviewPanel draft={draft} />

    return null
  }, [
    draft,
    firstEpic.title,
    firstStory.acceptanceCriteria,
    firstStory.examples,
    firstStory.title,
    firstStory.userStory,
    locale,
    setLocale,
    step,
    t
  ])

  return (
    <div className="stack">
      <header>
        <div>
          <h1>{t("wizard.title")}</h1>
          <p>{t("wizard.subtitle")}</p>
        </div>
        <div className="locale-switcher">
          <select
            value={locale}
            onChange={(event) => {
              const nextLocale = event.target.value as FeatureDraft["metadata"]["locale"]
              setLocale(nextLocale)
              setDraft({ ...draft, metadata: { ...draft.metadata, locale: nextLocale } })
            }}
            aria-label="Change Language"
          >
            <option value="zh-TW">繁體中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </header>

      <nav className="step-nav">
        {steps.map((s, index) => (
          <div
            key={s}
            className={`step-nav-item ${index === stepIndex ? "active" : ""} ${index < stepIndex ? "completed" : ""}`}
            onClick={() => setStepIndex(index)}
          >
            {String(index + 1).padStart(2, "0")} {t(`step.${s}` as any)}
          </div>
        ))}
      </nav>

      {content}
      <nav className="button-row">
        <button
          className="secondary"
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
        >
          ← {t("wizard.previous")}
        </button>
        {stepIndex < steps.length - 1 ? (
          <button type="button" onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}>
            {stepIndex === steps.length - 2 ? t("wizard.reviewCta") : t("wizard.next")} →
          </button>
        ) : null}
      </nav>
    </div>
  )
}
