import type { FeatureDraft, Locale } from "./specTypes";

export function createEmptyDraft(locale: Locale = "zh-TW"): FeatureDraft {
  return {
    metadata: {
      title: "",
      owner: "",
      locale
    },
    summary: {
      problem: "",
      desiredOutcome: ""
    },
    goal: {
      statement: "",
      successSignals: [""]
    },
    impacts: [{ id: "IM-001", actor: "", impact: "" }],
    deliverables: [{ id: "DE-001", name: "", description: "" }],
    userActivities: [{ id: "UA-001", actor: "", activity: "" }],
    epics: [
      {
        id: "EP-001",
        title: "",
        stories: [
          {
            id: "US-001",
            title: "",
            userStory: "",
            acceptanceCriteria: [],
            examples: []
          }
        ]
      }
    ],
    agentBoundaries: {
      nonGoals: [],
      constraints: [],
      testExpectations: [],
      risks: [],
      openQuestions: []
    }
  };
}
