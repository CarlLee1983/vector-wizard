import type { FeatureDraft } from "../model/specTypes";

export function minimalValidDraft(): FeatureDraft {
  return {
    metadata: {
      title: "Login error message improvement",
      owner: "PM Team",
      locale: "en"
    },
    summary: {
      problem: "Users cannot tell how to recover from failed login attempts.",
      desiredOutcome: "Reduce support requests after failed logins."
    },
    goal: {
      statement: "Help users understand what to do after a failed login.",
      successSignals: ["Support requests about failed login decrease"]
    },
    impacts: [
      { id: "IM-001", actor: "Member", impact: "Can recover from login failure without support" }
    ],
    deliverables: [
      { id: "DE-001", name: "Login error messaging", description: "Clear safe messages for common failed-login states" }
    ],
    userActivities: [
      { id: "UA-001", actor: "Member", activity: "Enter credentials and submit the login form" }
    ],
    epics: [
      {
        id: "EP-001",
        title: "Login experience improvement",
        stories: [
          {
            id: "US-001",
            title: "Show a safe failed-login message",
            userStory: "As a member, I want a clear failed-login message so that I know how to recover.",
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
