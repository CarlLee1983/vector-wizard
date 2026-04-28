import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import { AssistButton } from "../AssistButton"
import { FieldArray } from "../FieldArray"
import type { FeatureDraft } from "../../model/specTypes"

interface GoalStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
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
