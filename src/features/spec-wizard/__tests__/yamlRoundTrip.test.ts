import { describe, expect, it } from "vitest"
import type { FeatureDraft } from "../model/specTypes"
import { draftToYaml } from "../services/yamlSerializer"
import { yamlToDraft } from "../services/yamlParser"
import {
  draftWithGwtAc,
  draftWithMeasurableSignal,
  draftWithRaid,
  draftWithRoadmap,
  minimalValidDraft
} from "../test/fixtures"

function roundTrip(draft: FeatureDraft): FeatureDraft {
  const yaml = draftToYaml(draft, "2026-04-29")
  return yamlToDraft(yaml).draft
}

describe("YAML round-trip", () => {
  it("minimalValidDraft → YAML → draft preserves metadata.title and locale", () => {
    const original = minimalValidDraft()
    const restored = roundTrip(original)
    expect(restored.metadata.title).toBe(original.metadata.title)
    expect(restored.metadata.locale).toBe(original.metadata.locale)
    expect(restored.metadata.owner).toBe(original.metadata.owner)
  })

  it("preserves goal.statement and at least one success signal", () => {
    const restored = roundTrip(minimalValidDraft())
    expect(restored.goal.statement).toBe("Help users understand what to do after a failed login.")
    expect(restored.goal.successSignals).toEqual([{ statement: "Support requests about failed login decrease" }])
  })

  it("preserves story id, title, userStory across round trip", () => {
    const restored = roundTrip(minimalValidDraft())
    const story = restored.epics[0].stories[0]
    expect(story.id).toBe("US-001")
    expect(story.title).toBe("Show a safe failed-login message")
    expect(story.userStory).toContain("As a member")
  })

  it("re-synthesizes impact / deliverable / userActivity / epic ids deterministically", () => {
    const restored = roundTrip(minimalValidDraft())
    expect(restored.impacts[0].id).toBe("IM-001")
    expect(restored.deliverables[0].id).toBe("DE-001")
    expect(restored.userActivities[0].id).toBe("UA-001")
    expect(restored.epics[0].id).toBe("EP-001")
  })

  it("preserves roadmap fields (id / horizon / priority / dependsOn)", () => {
    const restored = roundTrip(draftWithRoadmap())
    expect(restored.metadata.id).toBe("FT-001")
    expect(restored.metadata.horizon).toBe("now")
    expect(restored.metadata.priority).toBe("must")
    expect(restored.metadata.dependsOn).toEqual(["FT-002", "FT-005"])
  })

  it("preserves measurable success signal fields", () => {
    const restored = roundTrip(draftWithMeasurableSignal())
    expect(restored.goal.successSignals).toEqual([
      {
        statement: "Sign-up conversion rate improves by 15%",
        metric: "signup_completion_rate",
        threshold: "> 0.15",
        kind: "leading"
      }
    ])
  })

  it("preserves RAID structured entries (risks + openQuestions)", () => {
    const restored = roundTrip(draftWithRaid())
    expect(restored.agentBoundaries.risks).toEqual([
      {
        id: "R-001",
        text: "Token expiry edge case",
        status: "validating",
        mitigation: "Refresh quietly in background"
      },
      { id: "R-002", text: "Cold-start latency on serverless", status: "open" }
    ])
    expect(restored.agentBoundaries.openQuestions).toEqual([
      { id: "Q-001", text: "Should we support kiosk printing?", status: "open" }
    ])
  })

  it("preserves AC + GWT example shape", () => {
    const restored = roundTrip(draftWithGwtAc())
    expect(restored.epics[0].stories[0].acceptanceCriteria).toEqual([
      {
        id: "AC-001",
        statement: "Given the member enters a wrong password, when they submit, then the form shows a safe message."
      }
    ])
    expect(restored.epics[0].stories[0].examples[0].format).toBe("natural-language")
    expect(restored.epics[0].stories[0].examples[0].scenario).toBe("Wrong password three times in a row.")
  })

  it("does not leak export-only metadata.createdAt / metadata.status into the draft", () => {
    const restored = roundTrip(minimalValidDraft())
    expect((restored.metadata as Record<string, unknown>).createdAt).toBeUndefined()
    expect((restored.metadata as Record<string, unknown>).status).toBeUndefined()
  })

  it("zh-TW locale survives round trip even though YAML keys stay English", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "zh-TW"
    draft.metadata.title = "會員登入錯誤提示優化"
    const restored = roundTrip(draft)
    expect(restored.metadata.locale).toBe("zh-TW")
    expect(restored.metadata.title).toBe("會員登入錯誤提示優化")
  })
})
