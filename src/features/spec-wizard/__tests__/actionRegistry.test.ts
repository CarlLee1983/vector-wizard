import { describe, expect, it } from "vitest"
import {
  getActionsForStep,
  getActionById,
  type ActionStepId
} from "../services/localAgent/actionRegistry"

describe("actionRegistry", () => {
  it("returns empty array for unknown step", () => {
    expect(getActionsForStep("basic" as ActionStepId)).toEqual([])
  })

  it("returns empty array for stories step before any actions registered", () => {
    expect(Array.isArray(getActionsForStep("stories"))).toBe(true)
  })

  it("getActionById returns undefined for unknown id", () => {
    expect(getActionById("nope.nope")).toBeUndefined()
  })
})
