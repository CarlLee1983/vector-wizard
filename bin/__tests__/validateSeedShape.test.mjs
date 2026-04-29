import { describe, expect, it } from "vitest"
import { validateSeedShape } from "../lib/validateSeedShape.mjs"

describe("validateSeedShape", () => {
  const baseValid = {
    metadata: { title: "FT-001", locale: "zh-TW" },
    goal: { statement: "x", successSignals: [] },
    epics: [
      {
        id: "EP-001",
        title: "e",
        stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
      }
    ]
  }

  it("accepts a minimal valid feature-seed shape", () => {
    expect(validateSeedShape(baseValid)).toEqual({ valid: true })
  })

  it("rejects null", () => {
    expect(validateSeedShape(null)).toEqual({ valid: false, reason: "not_object" })
  })

  it("rejects non-object input", () => {
    expect(validateSeedShape("string")).toEqual({ valid: false, reason: "not_object" })
    expect(validateSeedShape(42)).toEqual({ valid: false, reason: "not_object" })
  })

  it("rejects when metadata is missing", () => {
    const { metadata: _omit, ...rest } = baseValid
    expect(validateSeedShape(rest)).toEqual({ valid: false, reason: "missing_metadata" })
  })

  it("rejects when goal is missing", () => {
    const { goal: _omit, ...rest } = baseValid
    expect(validateSeedShape(rest)).toEqual({ valid: false, reason: "missing_goal" })
  })

  it("rejects when epics is not an array", () => {
    expect(validateSeedShape({ ...baseValid, epics: "nope" })).toEqual({ valid: false, reason: "missing_epics" })
  })
})
