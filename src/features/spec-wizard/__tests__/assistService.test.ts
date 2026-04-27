import { describe, expect, it } from "vitest"
import { assistDraft } from "../services/assistService"
import { minimalValidDraft } from "../test/fixtures"

describe("assistDraft", () => {
  it("rewrites text without adding product decisions", async () => {
    const response = await assistDraft({ mode: "rewrite", locale: "en", text: "login error bad user confused" })

    expect(response.suggestedText).toBe("Clarify the login error so users understand the next recovery step.")
    expect(response.assumptions).toEqual([])
  })

  it("returns quality warnings for incomplete drafts", async () => {
    const draft = minimalValidDraft()
    draft.agentBoundaries.constraints = []

    const response = await assistDraft({ mode: "quality_check", locale: "en", draft })

    expect(response.warnings).toContain(
      "Add constraints so the coding agent does not over-implement or expose unsafe behavior."
    )
    expect(response.openQuestions).toContain("Are there security, privacy, or compliance constraints for this feature?")
  })
})
