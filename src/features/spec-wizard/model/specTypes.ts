import type { MessageKey } from "../i18n/messageKeys"

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

export type Horizon = "now" | "next" | "later"

export type Priority = "must" | "should" | "could" | "wont"

/**
 * T-shirt 相對工時。值域刻意與 Path B 的 `feature-candidates.schema.json`
 * 對齊（S / M / L / XL，無 XS），只是改為小寫以符合本檔其他 metadata enum。
 * 大於 XL 的切片依方法論應先拆，不另設尺碼。
 */
export const ESTIMATED_SIZES = ["s", "m", "l", "xl"] as const

export type EstimatedSize = (typeof ESTIMATED_SIZES)[number]

export type SuccessSignalKind = "leading" | "lagging"

export type SuccessSignal = {
  statement: string
  metric?: string
  threshold?: string
  kind?: SuccessSignalKind
}

export type RaidStatus = "open" | "validating" | "validated" | "invalidated"

export type RaidEntry = {
  id: string
  text: string
  status: RaidStatus
  mitigation?: string
}

export type FeatureDraft = {
  metadata: {
    title: string
    owner?: string
    locale: Locale
    id?: string
    horizon?: Horizon
    priority?: Priority
    estimatedSize?: EstimatedSize
    dependsOn?: string[]
  }
  summary: {
    problem?: string
    desiredOutcome?: string
  }
  goal: {
    statement: string
    successSignals: SuccessSignal[]
  }
  impacts: Impact[]
  deliverables: Deliverable[]
  userActivities: UserActivity[]
  epics: Epic[]
  agentBoundaries: {
    nonGoals: string[]
    constraints: string[]
    testExpectations: string[]
    risks: RaidEntry[]
    openQuestions: RaidEntry[]
  }
}

export type ValidationCategory = "invest" | "general"

export type ValidationIssue = {
  code: string
  fieldPath: string
  messageKey?: MessageKey
  message?: string
  category?: ValidationCategory
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
