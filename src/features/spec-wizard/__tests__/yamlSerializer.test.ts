import { describe, expect, it } from "vitest"
import { buildHumanSummary } from "../services/summary"
import { draftToYaml, normalizeDraftForExport } from "../services/yamlSerializer"
import { draftWithRoadmap, minimalValidDraft } from "../test/fixtures"

describe("yamlSerializer", () => {
  it("serializes the required top-level YAML sections", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-26")

    expect(yaml).toContain('schemaVersion: "0.2"')
    expect(yaml).toContain("metadata:")
    expect(yaml).toContain("productSpec:")
    expect(yaml).toContain("agentSpec:")
    expect(yaml).toContain("Login error message improvement")
  })

  it("keeps YAML keys in English for zh-TW drafts", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "zh-TW"
    draft.metadata.title = "會員登入錯誤提示優化"

    const yaml = draftToYaml(draft, "2026-04-26")

    expect(yaml).toContain("productSpec:")
    expect(yaml).toContain("agentSpec:")
    expect(yaml).not.toContain("產品規格:")
  })

  it("filters empty optional list items", () => {
    const draft = minimalValidDraft()
    draft.goal.successSignals = [{ statement: "" }, { statement: "Support tickets decrease" }, { statement: "   " }]

    const normalized = normalizeDraftForExport(draft, "2026-04-26")

    expect(normalized.productSpec.goal.successSignals).toEqual([{ statement: "Support tickets decrease" }])
  })

  it("emits measurable success signal fields when set", () => {
    const draft = minimalValidDraft()
    draft.goal.successSignals = [
      {
        statement: "Sign-up conversion rate improves by 15%",
        metric: "signup_completion_rate",
        threshold: "> 0.15",
        kind: "leading"
      }
    ]

    const yaml = draftToYaml(draft, "2026-04-29")

    expect(yaml).toContain('statement: "Sign-up conversion rate improves by 15%"')
    expect(yaml).toContain('metric: "signup_completion_rate"')
    expect(yaml).toContain('threshold: "> 0.15"')
    expect(yaml).toContain('kind: "leading"')
  })

  it("omits blank metric/threshold/kind in YAML output", () => {
    const draft = minimalValidDraft()
    draft.goal.successSignals = [{ statement: "Higher CSAT", metric: "   ", threshold: "" }]

    const normalized = normalizeDraftForExport(draft, "2026-04-29")

    expect(normalized.productSpec.goal.successSignals).toEqual([{ statement: "Higher CSAT" }])
  })

  it("emits metadata.id only when set", () => {
    const withId = draftWithRoadmap()
    const withoutId = minimalValidDraft()

    const yamlWith = draftToYaml(withId, "2026-04-28")
    const yamlWithout = draftToYaml(withoutId, "2026-04-28")

    expect(yamlWith).toContain('id: "FT-001"')
    expect(yamlWithout).not.toContain('id: "FT-')
  })

  it("emits metadata.horizon only when set", () => {
    const withRoadmap = draftWithRoadmap()
    const withoutRoadmap = minimalValidDraft()

    expect(draftToYaml(withRoadmap, "2026-04-28")).toContain('horizon: "now"')
    expect(draftToYaml(withoutRoadmap, "2026-04-28")).not.toContain("horizon:")
  })

  it("emits metadata.priority only when set", () => {
    const withRoadmap = draftWithRoadmap()
    const withoutRoadmap = minimalValidDraft()

    expect(draftToYaml(withRoadmap, "2026-04-28")).toContain('priority: "must"')
    expect(draftToYaml(withoutRoadmap, "2026-04-28")).not.toContain("priority:")
  })

  it("emits metadata.dependsOn only when non-empty", () => {
    const withRoadmap = draftWithRoadmap()
    const withoutRoadmap = minimalValidDraft()
    const withEmptyArray = minimalValidDraft()
    withEmptyArray.metadata.dependsOn = []

    const yamlWith = draftToYaml(withRoadmap, "2026-04-28")
    expect(yamlWith).toContain("dependsOn:")
    expect(yamlWith).toContain('- "FT-002"')
    expect(yamlWith).toContain('- "FT-005"')

    expect(draftToYaml(withoutRoadmap, "2026-04-28")).not.toContain("dependsOn:")
    expect(draftToYaml(withEmptyArray, "2026-04-28")).not.toContain("dependsOn:")
  })

  it("builds a human-readable summary", () => {
    const summary = buildHumanSummary(minimalValidDraft())

    expect(summary).toContain("Login error message improvement")
    expect(summary).toContain("Help users understand what to do after a failed login.")
    expect(summary).toContain("Show a safe failed-login message")
  })
})
