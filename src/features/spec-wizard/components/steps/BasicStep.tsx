import { useEffect, useState } from "react"
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
  const [dependsOnRaw, setDependsOnRaw] = useState(
    (draft.metadata.dependsOn ?? []).join(", ")
  )

  useEffect(() => {
    const next = (draft.metadata.dependsOn ?? []).join(", ")
    setDependsOnRaw((current) => {
      const currentNormalized = current
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")
      return currentNormalized === next ? current : next
    })
  }, [draft.metadata.dependsOn])

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

      <fieldset
        className="field-group"
        style={{
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "12px 16px",
          margin: "16px 0"
        }}
      >
        <legend>{t("step.roadmap")}</legend>

        <div className="field">
          <label htmlFor="featureId">{t("field.featureId")}</label>
          <small id="featureId-help">{t("field.featureIdHelp")}</small>
          <input
            id="featureId"
            aria-describedby="featureId-help"
            placeholder={t("field.featureIdPlaceholder")}
            value={draft.metadata.id ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  id: event.target.value.trim() || undefined
                }
              })
            }
          />
        </div>

        <div className="field">
          <label htmlFor="horizon">{t("field.horizon")}</label>
          <small id="horizon-help">{t("field.horizonHelp")}</small>
          <select
            id="horizon"
            aria-describedby="horizon-help"
            value={draft.metadata.horizon ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  horizon: (event.target.value || undefined) as typeof draft.metadata.horizon
                }
              })
            }
          >
            <option value="">{t("horizon.unset")}</option>
            <option value="now">{t("horizon.now")}</option>
            <option value="next">{t("horizon.next")}</option>
            <option value="later">{t("horizon.later")}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="priority">{t("field.priority")}</label>
          <small id="priority-help">{t("field.priorityHelp")}</small>
          <select
            id="priority"
            aria-describedby="priority-help"
            value={draft.metadata.priority ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  priority: (event.target.value || undefined) as typeof draft.metadata.priority
                }
              })
            }
          >
            <option value="">{t("priority.unset")}</option>
            <option value="must">{t("priority.must")}</option>
            <option value="should">{t("priority.should")}</option>
            <option value="could">{t("priority.could")}</option>
            <option value="wont">{t("priority.wont")}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="dependsOn">{t("field.dependsOn")}</label>
          <small id="dependsOn-help">{t("field.dependsOnHelp")}</small>
          <input
            id="dependsOn"
            aria-describedby="dependsOn-help"
            placeholder={t("field.dependsOnPlaceholder")}
            value={dependsOnRaw}
            onChange={(event) => {
              const raw = event.target.value
              setDependsOnRaw(raw)
              const list = raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  dependsOn: list.length > 0 ? list : undefined
                }
              })
            }}
          />
        </div>
      </fieldset>

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
