import type { FeatureDraft } from "../model/specTypes"

export const DRAFT_STORAGE_KEY = "vector.featureDraft.v1"

/**
 * @deprecated 僅供 draftStore migration 使用，新程式碼請用 draftStore.ts。
 */
export function loadDraft(): FeatureDraft | null {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    return draftFromJson(raw)
  } catch {
    return null
  }
}

export function draftToJson(draft: FeatureDraft): string {
  return JSON.stringify(draft, null, 2)
}

export function draftFromJson(raw: string): FeatureDraft {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== "object" || !parsed.metadata || !parsed.goal || !Array.isArray(parsed.epics)) {
    throw new Error("Invalid draft JSON")
  }
  return normalizeDraft(parsed)
}

export function normalizeDraft(draft: any): FeatureDraft {
  return {
    ...draft,
    metadata: {
      owner: "",
      ...draft.metadata
    },
    summary: {
      problem: "",
      desiredOutcome: "",
      ...draft.summary
    },
    goal: {
      statement: "",
      successSignals: [],
      ...draft.goal
    },
    impacts: (draft.impacts || []).map((i: any) => ({
      id: i.id || "",
      actor: i.actor || "",
      impact: i.impact || ""
    })),
    deliverables: (draft.deliverables || []).map((d: any) => ({
      id: d.id || "",
      name: d.name || "",
      description: d.description || ""
    })),
    userActivities: (draft.userActivities || []).map((u: any) => ({
      id: u.id || "",
      actor: u.actor || "",
      activity: u.activity || ""
    })),
    epics: (draft.epics || []).map((epic: any) => ({
      ...epic,
      stories: (epic.stories || []).map((story: any) => ({
        ...story,
        acceptanceCriteria: story.acceptanceCriteria || [],
        examples: story.examples || []
      }))
    })),
    agentBoundaries: {
      nonGoals: [],
      constraints: [],
      testExpectations: [],
      risks: [],
      openQuestions: [],
      ...draft.agentBoundaries
    }
  }
}
