import { beforeEach, describe, expect, it } from "vitest"
import { draftFromJson, draftToJson, loadDraft } from "../persistence/draftStorage"
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
})
