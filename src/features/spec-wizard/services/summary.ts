import type { FeatureDraft, SuccessSignal } from "../model/specTypes"
import { getStories } from "../model/validation"

function listOrFallback(items: string[], fallback: string): string {
  const nonBlank = items.filter((item) => item.trim().length > 0)
  return nonBlank.length > 0 ? nonBlank.map((item) => `- ${item}`).join("\n") : `- ${fallback}`
}

function formatSuccessSignal(signal: SuccessSignal): string {
  const parts: string[] = []
  if (signal.metric && signal.metric.trim()) parts.push(`metric: ${signal.metric.trim()}`)
  if (signal.threshold && signal.threshold.trim()) parts.push(`threshold: ${signal.threshold.trim()}`)
  if (signal.kind) parts.push(`kind: ${signal.kind}`)
  const suffix = parts.length > 0 ? ` (${parts.join(", ")})` : ""
  return `${signal.statement.trim()}${suffix}`
}

function successSignalLines(signals: SuccessSignal[], fallback: string): string {
  const named = signals.filter((signal) => signal.statement.trim().length > 0)
  if (named.length === 0) return `- ${fallback}`
  return named.map((signal) => `- ${formatSuccessSignal(signal)}`).join("\n")
}

export function buildHumanSummary(draft: FeatureDraft): string {
  const stories = getStories(draft).filter(
    (story) => story.title.trim().length > 0 || story.userStory.trim().length > 0
  )
  const storyLines = stories.map((story) => `- ${story.title || story.userStory}`).join("\n") || "- No story provided"

  return [
    `# ${draft.metadata.title || "Untitled Feature"}`,
    "",
    `Owner: ${draft.metadata.owner || "Unassigned"}`,
    "",
    "## Problem",
    draft.summary.problem || "No problem statement provided.",
    "",
    "## Desired Outcome",
    draft.summary.desiredOutcome || "No desired outcome provided.",
    "",
    "## Goal",
    draft.goal.statement || "No goal provided.",
    "",
    "## Success Signals",
    successSignalLines(draft.goal.successSignals, "No success signal provided"),
    "",
    "## Stories",
    storyLines,
    "",
    "## Constraints",
    listOrFallback(draft.agentBoundaries.constraints, "No constraints provided"),
    "",
    "## Non-goals",
    listOrFallback(draft.agentBoundaries.nonGoals, "No non-goals provided")
  ].join("\n")
}
