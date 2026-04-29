import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import { FieldArray } from "../FieldArray"
import { RaidArray } from "../RaidArray"
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
      <RaidArray
        label={t("field.risks")}
        idPrefix="R"
        allowMitigation
        help={t("field.risksHelp")}
        helpId="risks-help"
        placeholder={t("field.risksPlaceholder")}
        entries={draft.agentBoundaries.risks}
        onChange={(risks) => setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, risks } })}
      />
      <RaidArray
        label={t("field.openQuestions")}
        idPrefix="Q"
        allowMitigation={false}
        help={t("field.openQuestionsHelp")}
        helpId="open-questions-help"
        placeholder={t("field.openQuestionsPlaceholder")}
        entries={draft.agentBoundaries.openQuestions}
        onChange={(openQuestions) =>
          setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, openQuestions } })
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
