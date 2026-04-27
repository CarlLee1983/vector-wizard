import { beforeEach, describe, expect, it } from "vitest"
import { draftFromJson, draftToJson, loadDraft } from "../persistence/draftStorage"
import { minimalValidDraft } from "../test/fixtures"

describe("draftStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("loadDraft returns null when storage is empty", () => {
    expect(loadDraft()).toBeNull()
  })

  it("loadDraft returns the parsed draft when v1 key is set", () => {
    const draft = minimalValidDraft()
    localStorage.setItem("vector.featureDraft.v1", JSON.stringify(draft))
    expect(loadDraft()).toEqual(draft)
  })

  it("loadDraft returns null when v1 key contains invalid JSON", () => {
    localStorage.setItem("vector.featureDraft.v1", "not-json")
    expect(loadDraft()).toBeNull()
  })

  it("draftToJson then draftFromJson round-trips a draft", () => {
    const draft = minimalValidDraft()
    const json = draftToJson(draft)
    expect(draftFromJson(json)).toEqual(draft)
  })

  it("draftFromJson throws on missing required fields", () => {
    expect(() => draftFromJson(JSON.stringify({ no: "metadata" }))).toThrow()
  })
})
