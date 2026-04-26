import type { FeatureDraft, UserStory, ValidationIssue, ValidationResult } from "./specTypes";

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function nonBlankItems(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0);
}

export function getStories(draft: FeatureDraft): UserStory[] {
  return draft.epics.flatMap((epic) => epic.stories);
}

export function validateDraft(draft: FeatureDraft): ValidationResult {
  const blockingErrors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (isBlank(draft.metadata.title)) {
    blockingErrors.push({
      code: "missing_title",
      fieldPath: "metadata.title",
      messageKey: "validation.missingTitle"
    });
  }

  if (isBlank(draft.goal.statement)) {
    blockingErrors.push({
      code: "missing_goal",
      fieldPath: "goal.statement",
      messageKey: "validation.missingGoal"
    });
  }

  const stories = getStories(draft).filter((story) => !isBlank(story.title) || !isBlank(story.userStory));
  if (stories.length === 0) {
    blockingErrors.push({
      code: "missing_story",
      fieldPath: "epics",
      messageKey: "validation.missingStory"
    });
  }

  for (const story of stories) {
    if (story.acceptanceCriteria.length === 0) {
      warnings.push({
        code: "story_missing_acceptance_criteria",
        fieldPath: `stories.${story.id}.acceptanceCriteria`,
        messageKey: "validation.storyMissingAcceptanceCriteria"
      });
    }

    if (story.examples.length === 0) {
      warnings.push({
        code: "story_missing_examples",
        fieldPath: `stories.${story.id}.examples`,
        messageKey: "validation.storyMissingExamples"
      });
    }
  }

  if (nonBlankItems(draft.agentBoundaries.constraints).length === 0) {
    warnings.push({
      code: "missing_constraints",
      fieldPath: "agentBoundaries.constraints",
      messageKey: "validation.missingConstraints"
    });
  }

  if (nonBlankItems(draft.agentBoundaries.nonGoals).length === 0) {
    warnings.push({
      code: "missing_non_goals",
      fieldPath: "agentBoundaries.nonGoals",
      messageKey: "validation.missingNonGoals"
    });
  }

  for (const signal of draft.goal.successSignals) {
    const normalized = signal.trim().toLowerCase();
    if (["better", "faster", "更好", "更快", "提升"].includes(normalized)) {
      warnings.push({
        code: "vague_success_signal",
        fieldPath: "goal.successSignals",
        messageKey: "validation.vagueSuccessSignal"
      });
    }
  }

  if (nonBlankItems(draft.agentBoundaries.openQuestions).length > 0) {
    warnings.push({
      code: "open_questions_present",
      fieldPath: "agentBoundaries.openQuestions",
      messageKey: "validation.openQuestionsPresent"
    });
  }

  return { blockingErrors, warnings };
}
