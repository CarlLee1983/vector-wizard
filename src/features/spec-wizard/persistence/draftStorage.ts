import { ESTIMATED_SIZES } from "../model/specTypes"
import type {
  EstimatedSize,
  FeatureDraft,
  RaidEntry,
  RaidStatus,
  SuccessSignal,
  SuccessSignalKind
} from "../model/specTypes"

const SIGNAL_KINDS: readonly SuccessSignalKind[] = ["leading", "lagging"]
const RAID_STATUSES: readonly RaidStatus[] = ["open", "validating", "validated", "invalidated"]

function normalizeSuccessSignal(value: unknown): SuccessSignal {
  if (typeof value === "string") {
    return { statement: value }
  }
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>
    const statement = typeof raw.statement === "string" ? raw.statement : ""
    const signal: SuccessSignal = { statement }
    if (typeof raw.metric === "string" && raw.metric.trim().length > 0) {
      signal.metric = raw.metric
    }
    if (typeof raw.threshold === "string" && raw.threshold.trim().length > 0) {
      signal.threshold = raw.threshold
    }
    if (typeof raw.kind === "string" && (SIGNAL_KINDS as readonly string[]).includes(raw.kind)) {
      signal.kind = raw.kind as SuccessSignalKind
    }
    return signal
  }
  return { statement: "" }
}

export function normalizeRaidEntries(value: unknown, prefix: "R" | "Q"): RaidEntry[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index): RaidEntry => {
    const fallbackId = `${prefix}-${String(index + 1).padStart(3, "0")}`
    if (typeof item === "string") {
      return { id: fallbackId, text: item, status: "open" }
    }
    if (item && typeof item === "object") {
      const raw = item as Record<string, unknown>
      const id = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id : fallbackId
      const text = typeof raw.text === "string" ? raw.text : ""
      const status =
        typeof raw.status === "string" && (RAID_STATUSES as readonly string[]).includes(raw.status)
          ? (raw.status as RaidStatus)
          : "open"
      const mitigation =
        typeof raw.mitigation === "string" && raw.mitigation.trim().length > 0 ? raw.mitigation : undefined
      const entry: RaidEntry = { id, text, status }
      if (mitigation) entry.mitigation = mitigation
      return entry
    }
    return { id: fallbackId, text: "", status: "open" }
  })
}

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

/**
 * Path B 的 Stage 3 產出大寫的 S / M / L / XL；Stage 4 交接時應轉小寫，
 * 但就算漏轉也不能讓估算掉在地上——這正是這個欄位存在的理由。
 * 值域外的輸入一律丟棄，不讓它污染型別。
 */
function normalizeEstimatedSize(raw: unknown): { estimatedSize?: EstimatedSize } {
  if (typeof raw !== "string") return {}
  const lowered = raw.trim().toLowerCase()
  return (ESTIMATED_SIZES as readonly string[]).includes(lowered) ? { estimatedSize: lowered as EstimatedSize } : {}
}

export function normalizeDraft(draft: any): FeatureDraft {
  // estimatedSize 必須先從展開中剔除，否則值域外的原始值（例如 "xs"）會直接
  // 穿過 `...draft.metadata`，而正規化回傳的空物件蓋不掉已存在的鍵。
  const { estimatedSize: rawEstimatedSize, ...restMetadata } = draft.metadata ?? {}

  return {
    ...draft,
    metadata: {
      owner: "",
      ...restMetadata,
      ...(draft.metadata?.id ? { id: draft.metadata.id } : {}),
      ...(draft.metadata?.horizon ? { horizon: draft.metadata.horizon } : {}),
      ...(draft.metadata?.priority ? { priority: draft.metadata.priority } : {}),
      ...normalizeEstimatedSize(rawEstimatedSize),
      ...(Array.isArray(draft.metadata?.dependsOn) ? { dependsOn: draft.metadata.dependsOn } : {})
    },
    summary: {
      problem: "",
      desiredOutcome: "",
      ...draft.summary
    },
    goal: {
      statement: "",
      ...draft.goal,
      successSignals: Array.isArray(draft.goal?.successSignals)
        ? draft.goal.successSignals.map(normalizeSuccessSignal)
        : []
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
      nonGoals: Array.isArray(draft.agentBoundaries?.nonGoals) ? draft.agentBoundaries.nonGoals : [],
      constraints: Array.isArray(draft.agentBoundaries?.constraints) ? draft.agentBoundaries.constraints : [],
      testExpectations: Array.isArray(draft.agentBoundaries?.testExpectations)
        ? draft.agentBoundaries.testExpectations
        : [],
      risks: normalizeRaidEntries(draft.agentBoundaries?.risks, "R"),
      openQuestions: normalizeRaidEntries(draft.agentBoundaries?.openQuestions, "Q")
    }
  }
}
