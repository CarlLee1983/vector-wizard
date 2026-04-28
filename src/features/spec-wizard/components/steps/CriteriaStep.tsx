import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import { FieldArray } from "../FieldArray"
import type { FeatureDraft } from "../../model/specTypes"
import { updateStory } from "./utils"

interface CriteriaStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

export function CriteriaStep({ draft, setDraft }: CriteriaStepProps) {
  const { t } = useI18n()
  const firstEpic = draft.epics[0]
  const firstStory = firstEpic?.stories?.[0]

  if (!firstEpic || !firstStory) return null

  return (
    <WizardStep title={t("step.criteria")} method="Specification by Example">
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
