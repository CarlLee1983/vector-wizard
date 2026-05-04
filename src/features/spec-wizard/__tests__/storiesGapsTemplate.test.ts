import { describe, expect, it } from "vitest"
import { storiesGapsTemplate } from "../services/localAgent/promptTemplates/storiesGaps"
import { minimalValidDraft } from "../test/fixtures"

describe("storiesGapsTemplate", () => {
  it("includes the user story and goal", () => {
    const draft = minimalValidDraft()
    const out = storiesGapsTemplate({ draft })
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out).toContain(draft.goal.statement)
  })

  it("requests notes-shape vector-action output", () => {
    const draft = minimalValidDraft()
    const out = storiesGapsTemplate({ draft })
    expect(out).toContain("```vector-action")
    expect(out).toContain('"notes"')
    expect(out).toContain('"severity"')
  })
})
