import { describe, expect, it } from "vitest"
import { getActionsForStep, getActionById } from "../services/localAgent/actionRegistry"

describe("actionRegistry", () => {
  it("registers 3 actions on stories step", () => {
    const actions = getActionsForStep("stories")
    expect(actions.map((a) => a.id).sort()).toEqual(["stories.consistency", "stories.gaps", "stories.rewrite"])
  })

  it("stories.rewrite has mutationKind preview", () => {
    expect(getActionById("stories.rewrite")?.mutationKind).toBe("preview")
  })

  it("stories.gaps has mutationKind notes", () => {
    expect(getActionById("stories.gaps")?.mutationKind).toBe("notes")
  })

  it("stories.consistency has mutationKind notes", () => {
    expect(getActionById("stories.consistency")?.mutationKind).toBe("notes")
  })

  it("all stories actions have a non-empty disallowedTools list", () => {
    const actions = getActionsForStep("stories")
    expect(actions.every((a) => a.disallowedTools.length > 0)).toBe(true)
  })

  it("disallowedTools includes Bash, Read, Edit at minimum", () => {
    const actions = getActionsForStep("stories")
    for (const a of actions) {
      expect(a.disallowedTools).toContain("Bash")
      expect(a.disallowedTools).toContain("Read")
      expect(a.disallowedTools).toContain("Edit")
    }
  })

  it("returns empty array for steps with no actions", () => {
    expect(getActionsForStep("basic")).toEqual([])
    expect(getActionsForStep("goal")).toEqual([])
  })

  it("getActionById returns undefined for unknown id", () => {
    expect(getActionById("nope.nope")).toBeUndefined()
  })
})
