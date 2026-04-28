import { useI18n } from "../../i18n/I18nContext"
import { draftFromJson } from "../../persistence/draftStorage"
import { WizardStep } from "../WizardStep"
import { SeedPromptSection } from "../SeedPromptSection"
import type { FeatureDraft } from "../../model/specTypes"

interface BasicStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

export function BasicStep({ draft, setDraft }: BasicStepProps) {
  const { t } = useI18n()
  return (
    <WizardStep title={t("step.basic")}>
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

      <SeedPromptSection title={draft.metadata.title} owner={draft.metadata.owner} />

      <div className="field" style={{ marginTop: "32px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
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
