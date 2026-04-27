import { beforeEach, describe, expect, it } from "vitest"
import { clearDraft, loadDraft, saveDraft } from "../persistence/draftStorage"
import { minimalValidDraft } from "../test/fixtures"

describe("draftStorage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("saves and loads a draft", () => {
    const draft = minimalValidDraft()

    saveDraft(draft)

    expect(loadDraft()).toEqual(draft)
  })

  it("returns null when storage is empty", () => {
    expect(loadDraft()).toBeNull()
  })

  it("clears a stored draft", () => {
    saveDraft(minimalValidDraft())

    clearDraft()

    expect(loadDraft()).toBeNull()
  })

  it("returns null for invalid stored JSON", () => {
    localStorage.setItem("vector.featureDraft.v1", "not-json")

    expect(loadDraft()).toBeNull()
  })
})
