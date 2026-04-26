import type { FeatureDraft } from "../model/specTypes";

export const DRAFT_STORAGE_KEY = "vector.featureDraft.v1";

export function saveDraft(draft: FeatureDraft): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function loadDraft(): FeatureDraft | null {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FeatureDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function draftToJson(draft: FeatureDraft): string {
  return JSON.stringify(draft, null, 2);
}

export function draftFromJson(raw: string): FeatureDraft {
  const parsed = JSON.parse(raw) as FeatureDraft;
  if (!parsed.metadata || !parsed.goal || !Array.isArray(parsed.epics)) {
    throw new Error("Invalid draft JSON");
  }
  return parsed;
}
