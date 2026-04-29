import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import { AssistButton } from "../AssistButton"
import type { FeatureDraft, SuccessSignal, SuccessSignalKind } from "../../model/specTypes"

interface GoalStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

function updateSignal(signals: SuccessSignal[], index: number, patch: Partial<SuccessSignal>): SuccessSignal[] {
  return signals.map((signal, i) => (i === index ? { ...signal, ...patch } : signal))
}

export function GoalStep({ draft, setDraft }: GoalStepProps) {
  const { t } = useI18n()
  return (
    <WizardStep title={t("step.goal")} method="Impact Mapping">
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
        <div className="field-actions">
          <AssistButton
            mode="rewrite"
            text={draft.goal.statement}
            onApply={(suggestedText) => setDraft({ ...draft, goal: { ...draft.goal, statement: suggestedText } })}
          />
        </div>
      </div>
      <div className="field stack">
        <span>{t("field.successSignals")}</span>
        <small id="success-signals-help">{t("field.successSignalsHelp")}</small>
        <div className="stack" aria-describedby="success-signals-help">
          {draft.goal.successSignals.map((signal, index) => (
            <div key={index} className="success-signal-row stack">
              <label className="stack">
                <span>{t("field.successSignalStatement")}</span>
                <small>{t("field.successSignalStatementHelp")}</small>
                <input
                  type="text"
                  aria-label={`${t("field.successSignals")} ${index + 1}`}
                  placeholder={t("field.successSignalStatementPlaceholder")}
                  value={signal.statement}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      goal: {
                        ...draft.goal,
                        successSignals: updateSignal(draft.goal.successSignals, index, {
                          statement: event.target.value
                        })
                      }
                    })
                  }
                />
              </label>
              <label className="stack">
                <span>{t("field.successSignalMetric")}</span>
                <small>{t("field.successSignalMetricHelp")}</small>
                <input
                  type="text"
                  placeholder={t("field.successSignalMetricPlaceholder")}
                  value={signal.metric ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      goal: {
                        ...draft.goal,
                        successSignals: updateSignal(draft.goal.successSignals, index, {
                          metric: event.target.value
                        })
                      }
                    })
                  }
                />
              </label>
              <label className="stack">
                <span>{t("field.successSignalThreshold")}</span>
                <small>{t("field.successSignalThresholdHelp")}</small>
                <input
                  type="text"
                  placeholder={t("field.successSignalThresholdPlaceholder")}
                  value={signal.threshold ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      goal: {
                        ...draft.goal,
                        successSignals: updateSignal(draft.goal.successSignals, index, {
                          threshold: event.target.value
                        })
                      }
                    })
                  }
                />
              </label>
              <label className="stack">
                <span>{t("field.successSignalKind")}</span>
                <small>{t("field.successSignalKindHelp")}</small>
                <select
                  value={signal.kind ?? ""}
                  onChange={(event) => {
                    const next = event.target.value as SuccessSignalKind | ""
                    setDraft({
                      ...draft,
                      goal: {
                        ...draft.goal,
                        successSignals: updateSignal(draft.goal.successSignals, index, {
                          kind: next === "" ? undefined : next
                        })
                      }
                    })
                  }}
                >
                  <option value="">{t("kind.unset")}</option>
                  <option value="leading">{t("kind.leading")}</option>
                  <option value="lagging">{t("kind.lagging")}</option>
                </select>
              </label>
              {draft.goal.successSignals.length > 1 ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      goal: {
                        ...draft.goal,
                        successSignals: draft.goal.successSignals.filter((_, i) => i !== index)
                      }
                    })
                  }
                >
                  −
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                goal: {
                  ...draft.goal,
                  successSignals: [...draft.goal.successSignals, { statement: "" }]
                }
              })
            }
          >
            {t("wizard.addItem")}
          </button>
        </div>
      </div>
    </WizardStep>
  )
}
