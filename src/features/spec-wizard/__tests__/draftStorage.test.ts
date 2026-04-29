import { beforeEach, describe, expect, it } from "vitest"
import { draftFromJson, draftToJson, loadDraft, normalizeRaidEntries } from "../persistence/draftStorage"
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

  it("loads legacy draft (no roadmap fields) and leaves them undefined", () => {
    const legacyJson = JSON.stringify({
      metadata: { title: "Legacy", locale: "en" },
      summary: {},
      goal: { statement: "x", successSignals: [] },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
    })

    const draft = draftFromJson(legacyJson)

    expect(draft.metadata.title).toBe("Legacy")
    expect(draft.metadata.id).toBeUndefined()
    expect(draft.metadata.horizon).toBeUndefined()
    expect(draft.metadata.priority).toBeUndefined()
    expect(draft.metadata.dependsOn).toBeUndefined()
    expect(draft.agentBoundaries.risks).toEqual([])
    expect(draft.agentBoundaries.openQuestions).toEqual([])
  })

  it("migrates legacy string success signals into objects", () => {
    const legacyJson = JSON.stringify({
      metadata: { title: "Legacy", locale: "en" },
      summary: {},
      goal: { statement: "x", successSignals: ["Support tickets decrease", "  ", "Higher CSAT"] },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
    })

    const draft = draftFromJson(legacyJson)

    expect(draft.goal.successSignals).toEqual([
      { statement: "Support tickets decrease" },
      { statement: "  " },
      { statement: "Higher CSAT" }
    ])
  })

  it("preserves measurable success signal fields when present in JSON", () => {
    const json = JSON.stringify({
      metadata: { title: "Measurable", locale: "en" },
      summary: {},
      goal: {
        statement: "x",
        successSignals: [
          {
            statement: "Sign-up conversion rate improves by 15%",
            metric: "signup_completion_rate",
            threshold: "> 0.15",
            kind: "leading"
          }
        ]
      },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
    })

    const draft = draftFromJson(json)

    expect(draft.goal.successSignals).toEqual([
      {
        statement: "Sign-up conversion rate improves by 15%",
        metric: "signup_completion_rate",
        threshold: "> 0.15",
        kind: "leading"
      }
    ])
  })

  it("preserves roadmap fields when present in JSON", () => {
    const json = JSON.stringify({
      metadata: {
        title: "New",
        locale: "en",
        id: "FT-001",
        horizon: "next",
        priority: "should",
        dependsOn: ["FT-000"]
      },
      summary: {},
      goal: { statement: "x", successSignals: [] },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
    })

    const draft = draftFromJson(json)

    expect(draft.metadata.id).toBe("FT-001")
    expect(draft.metadata.horizon).toBe("next")
    expect(draft.metadata.priority).toBe("should")
    expect(draft.metadata.dependsOn).toEqual(["FT-000"])
  })

  it("migrates legacy string risks into RaidEntry array on load", () => {
    const legacyJson = JSON.stringify({
      metadata: { title: "Legacy", locale: "en" },
      summary: {},
      goal: { statement: "x", successSignals: [] },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: {
        nonGoals: [],
        constraints: [],
        testExpectations: [],
        risks: ["既有查詢層在規模化下效能不足", "團隊仍回頭用試算表"],
        openQuestions: ["儀表板 schema 由誰負責定義？"]
      }
    })

    const draft = draftFromJson(legacyJson)

    expect(draft.agentBoundaries.risks).toEqual([
      { id: "R-001", text: "既有查詢層在規模化下效能不足", status: "open" },
      { id: "R-002", text: "團隊仍回頭用試算表", status: "open" }
    ])
    expect(draft.agentBoundaries.openQuestions).toEqual([
      { id: "Q-001", text: "儀表板 schema 由誰負責定義？", status: "open" }
    ])
  })

  it("preserves structured RaidEntry fields when JSON already has them", () => {
    const json = JSON.stringify({
      metadata: { title: "Structured", locale: "en" },
      summary: {},
      goal: { statement: "x", successSignals: [] },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: {
        nonGoals: [],
        constraints: [],
        testExpectations: [],
        risks: [{ id: "R-007", text: "Token edge case", status: "validating", mitigation: "Refresh quietly" }],
        openQuestions: [{ id: "Q-003", text: "PII rules?", status: "validated" }]
      }
    })

    const draft = draftFromJson(json)

    expect(draft.agentBoundaries.risks).toEqual([
      { id: "R-007", text: "Token edge case", status: "validating", mitigation: "Refresh quietly" }
    ])
    expect(draft.agentBoundaries.openQuestions).toEqual([{ id: "Q-003", text: "PII rules?", status: "validated" }])
  })
})

describe("normalizeRaidEntries", () => {
  it("converts a legacy string into a RaidEntry with default status and auto id", () => {
    const result = normalizeRaidEntries(["既有查詢層在規模化下效能不足"], "R")
    expect(result).toEqual([{ id: "R-001", text: "既有查詢層在規模化下效能不足", status: "open" }])
  })

  it("preserves explicit id, status and mitigation when present", () => {
    const result = normalizeRaidEntries(
      [{ id: "R-042", text: "Token expiry edge case", status: "validating", mitigation: "Refresh quietly" }],
      "R"
    )
    expect(result).toEqual([
      { id: "R-042", text: "Token expiry edge case", status: "validating", mitigation: "Refresh quietly" }
    ])
  })

  it("falls back to default id when entry id is missing or empty", () => {
    const result = normalizeRaidEntries(
      [
        { text: "Missing id", status: "open" },
        { id: "", text: "Empty id" }
      ],
      "Q"
    )
    expect(result).toEqual([
      { id: "Q-001", text: "Missing id", status: "open" },
      { id: "Q-002", text: "Empty id", status: "open" }
    ])
  })

  it("falls back to status 'open' when status is unknown or missing", () => {
    const result = normalizeRaidEntries(
      [
        { id: "R-001", text: "Bad status", status: "bogus" },
        { id: "R-002", text: "No status" }
      ],
      "R"
    )
    expect(result[0].status).toBe("open")
    expect(result[1].status).toBe("open")
  })

  it("drops blank mitigation strings", () => {
    const result = normalizeRaidEntries([{ id: "R-001", text: "x", status: "open", mitigation: "   " }], "R")
    expect(result[0].mitigation).toBeUndefined()
  })

  it("handles a mixed array of strings and objects", () => {
    const result = normalizeRaidEntries(
      ["legacy entry", { id: "R-007", text: "structured", status: "validated" }],
      "R"
    )
    expect(result).toEqual([
      { id: "R-001", text: "legacy entry", status: "open" },
      { id: "R-007", text: "structured", status: "validated" }
    ])
  })

  it("returns an empty array for non-array input", () => {
    expect(normalizeRaidEntries(undefined, "R")).toEqual([])
    expect(normalizeRaidEntries(null, "R")).toEqual([])
    expect(normalizeRaidEntries("not an array", "R")).toEqual([])
  })
})
