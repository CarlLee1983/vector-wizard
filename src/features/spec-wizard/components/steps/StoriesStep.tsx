import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import { AssistButton } from "../AssistButton"
import type { FeatureDraft } from "../../model/specTypes"
import { updateFirstEpic, updateStory } from "./utils"

interface StoriesStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

export function StoriesStep({ draft, setDraft }: StoriesStepProps) {
  const { t } = useI18n()
  const firstEpic = draft.epics[0]
  const firstStory = firstEpic?.stories?.[0]

  if (!firstEpic || !firstStory) return null

  return (
    <WizardStep title={t("step.stories")} method="Story Mapping">
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
        <div className="field-actions">
          <AssistButton
            mode="rewrite"
            text={firstStory.userStory}
            onApply={(suggestedText) => setDraft(updateStory(draft, { userStory: suggestedText }))}
          />
        </div>
      </div>
    </WizardStep>
  )
}
