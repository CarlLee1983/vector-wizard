import { describe, expect, it } from "vitest"
import { storiesConsistencyTemplate } from "../services/localAgent/promptTemplates/storiesConsistency"
import { minimalValidDraft, draftWithGwtAc } from "../test/fixtures"

describe("storiesConsistencyTemplate", () => {
  it("includes goal, story, and acceptanceCriteria", () => {
    const draft = draftWithGwtAc()
    const out = storiesConsistencyTemplate({ draft })
    expect(out).toContain(draft.goal.statement)
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out).toContain(draft.epics[0].stories[0].acceptanceCriteria[0].statement)
  })

  it("handles empty acceptanceCriteria gracefully", () => {
    const draft = minimalValidDraft()
    expect(draft.epics[0].stories[0].acceptanceCriteria).toHaveLength(0)
    const out = storiesConsistencyTemplate({ draft })
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out.length).toBeGreaterThan(0)
  })

  it("requests notes-shape vector-action output", () => {
    const out = storiesConsistencyTemplate({ draft: minimalValidDraft() })
    expect(out).toContain("```vector-action")
    expect(out).toContain('"notes"')
  })
})
