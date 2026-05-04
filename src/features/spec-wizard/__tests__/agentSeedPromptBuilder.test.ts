import { describe, expect, it } from "vitest"
import { buildAgentSeedRequest } from "../services/localAgent/agentSeedPromptBuilder"
import { minimalValidDraft } from "../test/fixtures"

describe("buildAgentSeedRequest", () => {
  it("includes title, owner, locale, and pipeline-b reference", () => {
    const prompt = buildAgentSeedRequest({
      title: "Habit tracker",
      owner: "PM Annie",
      locale: "zh-TW"
    })
    expect(prompt).toContain("Habit tracker")
    expect(prompt).toContain("PM Annie")
    expect(prompt).toContain("locale=zh-TW")
    expect(prompt).toContain("vector-pipeline-b")
    expect(prompt).toContain("bun run methodology:validate")
  })

  it("falls back to a placeholder when owner is missing", () => {
    const prompt = buildAgentSeedRequest({
      title: "Habit tracker",
      locale: "en"
    })
    expect(prompt).toContain("負責人：未指定")
    expect(prompt).toContain("locale=en")
    expect(prompt).toContain("English")
  })

  it("embeds the draft JSON snapshot when draft is provided", () => {
    const draft = minimalValidDraft()
    const prompt = buildAgentSeedRequest({
      title: draft.metadata.title,
      owner: draft.metadata.owner,
      locale: draft.metadata.locale,
      draft
    })
    expect(prompt).toContain("```json")
    expect(prompt).toContain('"title"')
    expect(prompt).toContain(draft.goal.statement)
  })

  it("notes the absence of a snapshot when draft is null", () => {
    const prompt = buildAgentSeedRequest({
      title: "New idea",
      locale: "zh-TW",
      draft: null
    })
    expect(prompt).not.toContain("```json")
    expect(prompt).toContain("尚無草稿 snapshot")
  })

  it("preserves invariants reminding the agent to avoid hallucination", () => {
    const prompt = buildAgentSeedRequest({ title: "x", locale: "zh-TW" })
    expect(prompt).toContain("non-authoritative")
    expect(prompt).toContain("openQuestions")
    expect(prompt).toContain("不要捏造")
  })
})
