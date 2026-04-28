import { useI18n } from "../../i18n/I18nContext"
import { WizardStep } from "../WizardStep"
import type { FeatureDraft } from "../../model/specTypes"
import { updateStory } from "./utils"

interface ExamplesStepProps {
  draft: FeatureDraft
  setDraft: (draft: FeatureDraft) => void
}

export function ExamplesStep({ draft, setDraft }: ExamplesStepProps) {
  const { t } = useI18n()
  const firstEpic = draft.epics[0]
  const firstStory = firstEpic?.stories?.[0]

  if (!firstEpic || !firstStory) return null

  const firstExample = firstStory.examples[0] ?? { id: "EX-001", format: "given-when-then" as const, scenario: "" }

  return (
    <WizardStep title={t("step.examples")} method="Specification by Example">
      <div className="field">
        <label htmlFor="exampleGiven">{t("field.given")}</label>
        <small id="example-given-help">{t("field.givenHelp")}</small>
        <textarea
          id="exampleGiven"
          aria-describedby="example-given-help"
          placeholder={t("field.givenPlaceholder")}
          value={firstExample.given ?? ""}
          onChange={(event) =>
            setDraft(
              updateStory(draft, {
                examples: [{ ...firstExample, given: event.target.value, format: "given-when-then" }]
              })
            )
          }
        />
      </div>
      <div className="field">
        <label htmlFor="exampleWhen">{t("field.when")}</label>
        <small id="example-when-help">{t("field.whenHelp")}</small>
        <textarea
          id="exampleWhen"
          aria-describedby="example-when-help"
          placeholder={t("field.whenPlaceholder")}
          value={firstExample.when ?? ""}
          onChange={(event) =>
            setDraft(
              updateStory(draft, {
                examples: [{ ...firstExample, when: event.target.value, format: "given-when-then" }]
              })
            )
          }
        />
      </div>
      <div className="field">
        <label htmlFor="exampleThen">{t("field.then")}</label>
        <small id="example-then-help">{t("field.thenHelp")}</small>
        <textarea
          id="exampleThen"
          aria-describedby="example-then-help"
          placeholder={t("field.thenPlaceholder")}
          value={firstExample.then ?? ""}
          onChange={(event) =>
            setDraft(
              updateStory(draft, {
                examples: [{ ...firstExample, then: event.target.value, format: "given-when-then" }]
              })
            )
          }
        />
      </div>
      <div className="field">
        <label htmlFor="exampleScenario">{t("field.exampleScenario")}</label>
        <small id="example-scenario-help">{t("field.exampleScenarioHelp")}</small>
        <textarea
          id="exampleScenario"
          aria-describedby="example-scenario-help"
          placeholder={t("field.exampleScenarioPlaceholder")}
          value={firstExample.scenario ?? ""}
          onChange={(event) =>
            setDraft(
              updateStory(draft, {
                examples: [{ ...firstExample, scenario: event.target.value }]
              })
            )
          }
        />
      </div>
    </WizardStep>
  )
}
