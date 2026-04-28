import { describe, expect, it } from "vitest"
import { createEmptyDraft } from "../model/defaultDraft"
import { validateDraft } from "../model/validation"
import { minimalValidDraft } from "../test/fixtures"

describe("validateDraft", () => {
  it("accepts a minimal valid draft and tags story-level INVEST warnings", () => {
    const result = validateDraft(minimalValidDraft())

    expect(result.blockingErrors).toEqual([])

    const acWarning = result.warnings.find((warning) => warning.code === "story_missing_acceptance_criteria")
    expect(acWarning).toBeDefined()
    expect(acWarning?.category).toBe("invest")

    const exampleWarning = result.warnings.find((warning) => warning.code === "story_missing_examples")
    expect(exampleWarning).toBeDefined()
    expect(exampleWarning?.category).toBe("invest")
  })

  it("blocks missing title", () => {
    const draft = minimalValidDraft()
    draft.metadata.title = ""

    const result = validateDraft(draft)

    expect(result.blockingErrors).toContainEqual({
      code: "missing_title",
      fieldPath: "metadata.title",
      messageKey: "validation.missingTitle"
    })
  })

  it("blocks missing goal statement", () => {
    const draft = minimalValidDraft()
    draft.goal.statement = "   "

    const result = validateDraft(draft)

    expect(result.blockingErrors).toContainEqual({
      code: "missing_goal",
      fieldPath: "goal.statement",
      messageKey: "validation.missingGoal"
    })
  })

  it("blocks drafts without stories", () => {
    const draft = minimalValidDraft()
    draft.epics = [{ id: "EP-001", title: "Empty epic", stories: [] }]

    const result = validateDraft(draft)

    expect(result.blockingErrors).toContainEqual({
      code: "missing_story",
      fieldPath: "epics",
      messageKey: "validation.missingStory"
    })
  })

  it("treats blank criteria and examples as missing", () => {
    const draft = minimalValidDraft()
    draft.epics[0].stories[0].acceptanceCriteria = [{ id: "AC-001", statement: "   " }]
    draft.epics[0].stories[0].examples = [{ id: "EX-001", format: "natural-language", scenario: "   " }]

    const result = validateDraft(draft)

    expect(result.warnings.map((warning) => warning.code)).toContain("story_missing_acceptance_criteria")
    expect(result.warnings.map((warning) => warning.code)).toContain("story_missing_examples")
  })

  it("returns warnings for missing boundaries", () => {
    const result = validateDraft(minimalValidDraft())

    expect(result.warnings.map((warning) => warning.code)).toContain("missing_constraints")
    expect(result.warnings.map((warning) => warning.code)).toContain("missing_non_goals")
  })

  it("warns when a generated spec is too sparse for agent handoff", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "en"
    draft.metadata.title = "CNC 刀具管理"
    draft.goal.successSignals = []
    draft.impacts = []
    draft.deliverables = []
    draft.userActivities = []
    draft.epics[0].title = ""
    draft.agentBoundaries.testExpectations = []

    const result = validateDraft(draft)

    expect(result.blockingErrors).toEqual([])
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "missing_success_signals",
        "missing_impacts",
        "missing_deliverables",
        "missing_user_activities",
        "missing_epic_title",
        "missing_test_expectations",
        "locale_content_mismatch"
      ])
    )
  })

  it("creates an empty draft with a starter epic and story", () => {
    const draft = createEmptyDraft("zh-TW")

    expect(draft.metadata.locale).toBe("zh-TW")
    expect(draft.epics).toHaveLength(1)
    expect(draft.epics[0].stories).toHaveLength(1)
  })

  it("warns when a story has examples but no acceptance criteria", () => {
    const draft = minimalValidDraft()
    draft.epics[0].stories[0].acceptanceCriteria = []
    draft.epics[0].stories[0].examples = [
      { id: "EX-001", format: "natural-language", scenario: "Member enters wrong password three times." }
    ]

    const result = validateDraft(draft)
    const warning = result.warnings.find((w) => w.code === "story_orphan_examples")

    expect(warning).toBeDefined()
    expect(warning?.category).toBe("invest")
    expect(warning?.messageKey).toBe("validation.storyOrphanExamples")
    expect(warning?.fieldPath).toBe(`stories.${draft.epics[0].stories[0].id}.examples`)
  })

  it("does not warn story_orphan_examples when both AC and examples exist", () => {
    const draft = minimalValidDraft()
    draft.epics[0].stories[0].acceptanceCriteria = [{ id: "AC-001", statement: "Returns 401 with safe message." }]
    draft.epics[0].stories[0].examples = [
      { id: "EX-001", format: "natural-language", scenario: "Member enters wrong password." }
    ]

    const result = validateDraft(draft)
    expect(result.warnings.find((w) => w.code === "story_orphan_examples")).toBeUndefined()
  })
})
