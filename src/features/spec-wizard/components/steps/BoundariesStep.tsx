import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import { FieldArray } from "../FieldArray"
import type { FeatureDraft } from "../../model/specTypes"

interface BoundariesStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

export function BoundariesStep({ draft, setDraft }: BoundariesStepProps) {
  const { t } = useI18n()
  return (
    <WizardStep title={t("step.boundaries")}>
      <FieldArray
        id="constraints"
        label={t("field.constraints")}
        help={t("field.constraintsHelp")}
        helpId="constraints-help"
        placeholder={t("field.constraintsPlaceholder")}
        values={draft.agentBoundaries.constraints}
        onChange={(constraints) => setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, constraints } })}
      />
      <FieldArray
        id="nonGoals"
        label={t("field.nonGoals")}
        help={t("field.nonGoalsHelp")}
        helpId="non-goals-help"
        placeholder={t("field.nonGoalsPlaceholder")}
        values={draft.agentBoundaries.nonGoals}
        onChange={(nonGoals) => setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, nonGoals } })}
      />
      <FieldArray
        label={t("field.risks")}
        help={t("field.risksHelp")}
        helpId="risks-help"
        placeholder={t("field.risksPlaceholder")}
        values={draft.agentBoundaries.risks.map((entry) => entry.text)}
        onChange={(texts) =>
          setDraft({
            ...draft,
            agentBoundaries: {
              ...draft.agentBoundaries,
              risks: texts.map((text, index) => {
                const previous = draft.agentBoundaries.risks[index]
                return {
                  id: previous?.id ?? `R-${String(index + 1).padStart(3, "0")}`,
                  text,
                  status: previous?.status ?? "open",
                  ...(previous?.mitigation ? { mitigation: previous.mitigation } : {})
                }
              })
            }
          })
        }
      />
      <FieldArray
        label={t("field.openQuestions")}
        help={t("field.openQuestionsHelp")}
        helpId="open-questions-help"
        placeholder={t("field.openQuestionsPlaceholder")}
        values={draft.agentBoundaries.openQuestions.map((entry) => entry.text)}
        onChange={(texts) =>
          setDraft({
            ...draft,
            agentBoundaries: {
              ...draft.agentBoundaries,
              openQuestions: texts.map((text, index) => {
                const previous = draft.agentBoundaries.openQuestions[index]
                return {
                  id: previous?.id ?? `Q-${String(index + 1).padStart(3, "0")}`,
                  text,
                  status: previous?.status ?? "open"
                }
              })
            }
          })
        }
      />
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
