import type { FeatureDraft } from "../../model/specTypes"

export function updateFirstEpic(draft: FeatureDraft, patch: Partial<FeatureDraft["epics"][number]>): FeatureDraft {
  return {
    ...draft,
    epics: draft.epics.map((epic, epicIndex) => (epicIndex === 0 ? { ...epic, ...patch } : epic))
  }
}

export function updateStory(
  draft: FeatureDraft,
  patch: Partial<FeatureDraft["epics"][number]["stories"][number]>
): FeatureDraft {
  return {
    ...draft,
    epics: draft.epics.map((epic, epicIndex) =>
      epicIndex === 0
        ? {
            ...epic,
            stories: epic.stories.map((story, storyIndex) => (storyIndex === 0 ? { ...story, ...patch } : story))
          }
        : epic
    )
  }
}
