import { describe, expect, it } from "vitest"
import { buildHumanSummary } from "../services/summary"
import { draftToYaml, normalizeDraftForExport } from "../services/yamlSerializer"
import { minimalValidDraft } from "../test/fixtures"

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
    draft.goal.successSignals = ["", "Support tickets decrease", "   "]

    const normalized = normalizeDraftForExport(draft, "2026-04-26")

    expect(normalized.productSpec.goal.successSignals).toEqual(["Support tickets decrease"])
  })

  it("builds a human-readable summary", () => {
    const summary = buildHumanSummary(minimalValidDraft())

    expect(summary).toContain("Login error message improvement")
    expect(summary).toContain("Help users understand what to do after a failed login.")
    expect(summary).toContain("Show a safe failed-login message")
  })
})
