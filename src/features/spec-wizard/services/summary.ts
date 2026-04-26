import type { FeatureDraft } from "../model/specTypes";
import { getStories } from "../model/validation";

function listOrFallback(items: string[], fallback: string): string {
  const nonBlank = items.filter((item) => item.trim().length > 0);
  return nonBlank.length > 0 ? nonBlank.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

export function buildHumanSummary(draft: FeatureDraft): string {
  const stories = getStories(draft).filter((story) => story.title.trim().length > 0 || story.userStory.trim().length > 0);
  const storyLines = stories.map((story) => `- ${story.title || story.userStory}`).join("\n") || "- No story provided";

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
    listOrFallback(draft.goal.successSignals, "No success signal provided"),
    "",
    "## Stories",
    storyLines,
    "",
    "## Constraints",
    listOrFallback(draft.agentBoundaries.constraints, "No constraints provided"),
    "",
    "## Non-goals",
    listOrFallback(draft.agentBoundaries.nonGoals, "No non-goals provided")
  ].join("\n");
}
