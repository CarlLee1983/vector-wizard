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
    return JSON.parse(raw) as FeatureDraft
  } catch {
    return null
  }
}

export function draftToJson(draft: FeatureDraft): string {
  return JSON.stringify(draft, null, 2)
}

export function draftFromJson(raw: string): FeatureDraft {
  const parsed = JSON.parse(raw) as FeatureDraft
  if (!parsed.metadata || !parsed.goal || !Array.isArray(parsed.epics)) {
    throw new Error("Invalid draft JSON")
  }
  return parsed
}
