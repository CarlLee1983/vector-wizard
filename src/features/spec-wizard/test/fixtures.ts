import type { FeatureDraft } from "../model/specTypes"

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
      successSignals: [{ statement: "Support requests about failed login decrease" }]
    },
    impacts: [{ id: "IM-001", actor: "Member", impact: "Can recover from login failure without support" }],
    deliverables: [
      { id: "DE-001", name: "Login error messaging", description: "Clear safe messages for common failed-login states" }
    ],
    userActivities: [{ id: "UA-001", actor: "Member", activity: "Enter credentials and submit the login form" }],
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
  }
}

export function draftWithRoadmap(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.metadata.id = "FT-001"
  draft.metadata.horizon = "now"
  draft.metadata.priority = "must"
  draft.metadata.dependsOn = ["FT-002", "FT-005"]
  return draft
}

export function draftWithGwtAc(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [
    {
      id: "AC-001",
      statement: "Given the member enters a wrong password, when they submit, then the form shows a safe message."
    }
  ]
  draft.epics[0].stories[0].examples = [
    { id: "EX-001", format: "natural-language", scenario: "Wrong password three times in a row." }
  ]
  return draft
}

export function draftWithMeasurableSignal(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.goal.successSignals = [
    {
      statement: "Sign-up conversion rate improves by 15%",
      metric: "signup_completion_rate",
      threshold: "> 0.15",
      kind: "leading"
    }
  ]
  return draft
}

export function draftWithPlainAc(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [{ id: "AC-001", statement: "登入失敗時要顯示安全訊息。" }]
  draft.epics[0].stories[0].examples = [{ id: "EX-001", format: "natural-language", scenario: "連續輸錯三次密碼。" }]
  return draft
}
