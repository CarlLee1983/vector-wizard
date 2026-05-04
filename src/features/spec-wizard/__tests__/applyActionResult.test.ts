import { describe, expect, it } from "vitest"
import { applyActionResultToDraft } from "../persistence/applyActionResult"
import { minimalValidDraft } from "../test/fixtures"

describe("applyActionResultToDraft", () => {
  it("replaces a nested string field by dot+index path", () => {
    const draft = minimalValidDraft()
    const next = applyActionResultToDraft(draft, {
      targetPath: "epics[0].stories[0].userStory",
      mode: "replace",
      value: "new user story text"
    })
    expect(next.epics[0].stories[0].userStory).toBe("new user story text")
    expect(draft.epics[0].stories[0].userStory).not.toBe("new user story text")
  })

  it("preserves sibling fields when replacing nested string", () => {
    const draft = minimalValidDraft()
    const next = applyActionResultToDraft(draft, {
      targetPath: "epics[0].stories[0].userStory",
      mode: "replace",
      value: "x"
    })
    expect(next.epics[0].stories[0].id).toBe(draft.epics[0].stories[0].id)
    expect(next.epics[0].stories[0].title).toBe(draft.epics[0].stories[0].title)
    expect(next.metadata).toEqual(draft.metadata)
  })

  it("throws on unknown path segment", () => {
    const draft = minimalValidDraft()
    expect(() =>
      applyActionResultToDraft(draft, {
        targetPath: "nonexistent.field",
        mode: "replace",
        value: "x"
      })
    ).toThrow()
  })

  it("throws on out-of-bounds array index", () => {
    const draft = minimalValidDraft()
    expect(() =>
      applyActionResultToDraft(draft, {
        targetPath: "epics[5].stories[0].userStory",
        mode: "replace",
        value: "x"
      })
    ).toThrow()
  })

  it("throws on insert mode (v1 not supported)", () => {
    const draft = minimalValidDraft()
    expect(() =>
      applyActionResultToDraft(draft, {
        targetPath: "epics[0].stories",
        mode: "insert",
        value: "x"
      })
    ).toThrow(/insert.*not supported/i)
  })
})
