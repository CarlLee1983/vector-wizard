import { describe, expect, it } from "vitest"
import { storiesRewriteTemplate } from "../services/localAgent/promptTemplates/storiesRewrite"
import { minimalValidDraft } from "../test/fixtures"

describe("storiesRewriteTemplate", () => {
  it("includes the existing user story text and goal", () => {
    const draft = minimalValidDraft()
    const out = storiesRewriteTemplate({ draft })
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out).toContain(draft.goal.statement)
  })

  it("includes vector-action fence instruction with replace mode", () => {
    const draft = minimalValidDraft()
    const out = storiesRewriteTemplate({ draft })
    expect(out).toContain("```vector-action")
    expect(out).toContain("epics[0].stories[0].userStory")
    expect(out).toContain('"mode": "replace"')
  })

  it("requests Traditional Chinese output when locale is zh-TW", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "zh-TW"
    const out = storiesRewriteTemplate({ draft })
    expect(out).toMatch(/繁體中文|zh-TW/)
  })

  it("requests English output when locale is en", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "en"
    const out = storiesRewriteTemplate({ draft })
    expect(out.toLowerCase()).toMatch(/english|\ben\b/)
  })
})
