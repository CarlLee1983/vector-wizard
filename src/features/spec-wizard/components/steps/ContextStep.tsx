import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import type { FeatureDraft } from "../../model/specTypes"

interface ContextStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

export function ContextStep({ draft, setDraft }: ContextStepProps) {
  const { t } = useI18n()
  const firstImpact = draft.impacts[0] ?? { id: "IM-001", actor: "", impact: "" }
  const firstActivity = draft.userActivities[0] ?? { id: "UA-001", actor: "", activity: "" }

  return (
    <WizardStep title={t("step.context")} method="Impact Mapping">
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
