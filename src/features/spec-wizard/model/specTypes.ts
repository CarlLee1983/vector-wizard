export type Locale = "zh-TW" | "en"

export type Impact = {
  id: string
  actor: string
  impact: string
}

export type Deliverable = {
  id: string
  name: string
  description: string
}

export type UserActivity = {
  id: string
  actor: string
  activity: string
}

export type AcceptanceCriterion = {
  id: string
  statement: string
}

export type ExampleScenario = {
  id: string
  format: "given-when-then" | "natural-language"
  given?: string
  when?: string
  then?: string
  scenario?: string
}

export type UserStory = {
  id: string
  title: string
  userStory: string
  acceptanceCriteria: AcceptanceCriterion[]
  examples: ExampleScenario[]
}

export type Epic = {
  id: string
  title: string
  stories: UserStory[]
}

export type FeatureDraft = {
  metadata: {
    title: string
    owner?: string
    locale: Locale
  }
  summary: {
    problem?: string
    desiredOutcome?: string
  }
  goal: {
    statement: string
    successSignals: string[]
  }
  impacts: Impact[]
  deliverables: Deliverable[]
  userActivities: UserActivity[]
  epics: Epic[]
  agentBoundaries: {
    nonGoals: string[]
    constraints: string[]
    testExpectations: string[]
    risks: string[]
    openQuestions: string[]
  }
}

export type ValidationIssue = {
  code: string
  fieldPath: string
  messageKey?: string
  message?: string
}

export type ValidationResult = {
  blockingErrors: ValidationIssue[]
  warnings: ValidationIssue[]
}

export type DraftId = string

export type DraftMetaEntry = {
  createdAt: number
  updatedAt: number
}

export type DraftStoreState = {
  version: 1
  activeDraftId: DraftId | null
  drafts: Record<DraftId, FeatureDraft>
  meta: Record<DraftId, DraftMetaEntry>
}
