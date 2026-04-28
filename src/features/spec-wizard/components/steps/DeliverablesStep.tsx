import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import type { FeatureDraft } from "../../model/specTypes"

interface DeliverablesStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

export function DeliverablesStep({ draft, setDraft }: DeliverablesStepProps) {
  const { t } = useI18n()
  const firstDeliverable = draft.deliverables[0] ?? { id: "DE-001", name: "", description: "" }

  return (
    <WizardStep title={t("step.deliverables")} method="Story Mapping">
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
