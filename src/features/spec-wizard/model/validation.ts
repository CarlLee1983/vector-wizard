import type { FeatureDraft, UserStory, ValidationIssue, ValidationResult } from "./specTypes"

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0
}

function nonBlankItems(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0)
}

function hasHanText(value: string | undefined): boolean {
  return /[\u3400-\u9fff]/u.test(value ?? "")
}

function draftTextValues(draft: FeatureDraft): string[] {
  return [
    draft.metadata.title,
    draft.metadata.owner,
    draft.summary.problem,
    draft.summary.desiredOutcome,
    draft.goal.statement,
    ...draft.goal.successSignals,
    ...draft.impacts.flatMap((impact) => [impact.actor, impact.impact]),
    ...draft.deliverables.flatMap((deliverable) => [deliverable.name, deliverable.description]),
    ...draft.userActivities.flatMap((activity) => [activity.actor, activity.activity]),
    ...draft.epics.flatMap((epic) => [
      epic.title,
      ...epic.stories.flatMap((story) => [
        story.title,
        story.userStory,
        ...story.acceptanceCriteria.map((criterion) => criterion.statement),
        ...story.examples.flatMap((example) => [example.given, example.when, example.then, example.scenario])
      ])
    ]),
    ...draft.agentBoundaries.nonGoals,
    ...draft.agentBoundaries.constraints,
    ...draft.agentBoundaries.testExpectations,
    ...draft.agentBoundaries.risks,
    ...draft.agentBoundaries.openQuestions
  ].filter((value): value is string => typeof value === "string")
}

export function getStories(draft: FeatureDraft): UserStory[] {
  return draft.epics.flatMap((epic) => epic.stories)
}

export function validateDraft(draft: FeatureDraft): ValidationResult {
  const blockingErrors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  if (isBlank(draft.metadata.title)) {
    blockingErrors.push({
      code: "missing_title",
      fieldPath: "metadata.title",
      messageKey: "validation.missingTitle"
    })
  }

  if (isBlank(draft.goal.statement)) {
    blockingErrors.push({
      code: "missing_goal",
      fieldPath: "goal.statement",
      messageKey: "validation.missingGoal"
    })
  }

  if (nonBlankItems(draft.goal.successSignals).length === 0) {
    warnings.push({
      code: "missing_success_signals",
      fieldPath: "goal.successSignals",
      messageKey: "validation.missingSuccessSignals"
    })
  }

  if (draft.impacts.filter((impact) => !isBlank(impact.actor) || !isBlank(impact.impact)).length === 0) {
    warnings.push({
      code: "missing_impacts",
      fieldPath: "impacts",
      messageKey: "validation.missingImpacts"
    })
  }

  if (
    draft.deliverables.filter((deliverable) => !isBlank(deliverable.name) || !isBlank(deliverable.description))
      .length === 0
  ) {
    warnings.push({
      code: "missing_deliverables",
      fieldPath: "deliverables",
      messageKey: "validation.missingDeliverables"
    })
  }

  if (draft.userActivities.filter((activity) => !isBlank(activity.actor) || !isBlank(activity.activity)).length === 0) {
    warnings.push({
      code: "missing_user_activities",
      fieldPath: "userActivities",
      messageKey: "validation.missingUserActivities"
    })
  }

  const stories = getStories(draft).filter((story) => !isBlank(story.title) || !isBlank(story.userStory))
  if (stories.length === 0) {
    blockingErrors.push({
      code: "missing_story",
      fieldPath: "epics",
      messageKey: "validation.missingStory"
    })
  }

  for (const epic of draft.epics) {
    if (epic.stories.some((story) => !isBlank(story.title) || !isBlank(story.userStory)) && isBlank(epic.title)) {
      warnings.push({
        code: "missing_epic_title",
        fieldPath: `epics.${epic.id}.title`,
        messageKey: "validation.missingEpicTitle"
      })
    }
  }

  for (const story of stories) {
    const hasAcceptanceCriteria = story.acceptanceCriteria.some((criterion) => !isBlank(criterion.statement))
    const hasExamples = story.examples.some(
      (example) =>
        !isBlank(example.given) || !isBlank(example.when) || !isBlank(example.then) || !isBlank(example.scenario)
    )

    if (!hasAcceptanceCriteria) {
      warnings.push({
        code: "story_missing_acceptance_criteria",
        fieldPath: `stories.${story.id}.acceptanceCriteria`,
        messageKey: "validation.storyMissingAcceptanceCriteria",
        category: "invest"
      })
    }

    if (!hasExamples) {
      warnings.push({
        code: "story_missing_examples",
        fieldPath: `stories.${story.id}.examples`,
        messageKey: "validation.storyMissingExamples",
        category: "invest"
      })
    }

    if (hasExamples && !hasAcceptanceCriteria) {
      warnings.push({
        code: "story_orphan_examples",
        fieldPath: `stories.${story.id}.examples`,
        messageKey: "validation.storyOrphanExamples",
        category: "invest"
      })
    }
  }

  if (nonBlankItems(draft.agentBoundaries.constraints).length === 0) {
    warnings.push({
      code: "missing_constraints",
      fieldPath: "agentBoundaries.constraints",
      messageKey: "validation.missingConstraints"
    })
  }

  if (nonBlankItems(draft.agentBoundaries.testExpectations).length === 0) {
    warnings.push({
      code: "missing_test_expectations",
      fieldPath: "agentBoundaries.testExpectations",
      messageKey: "validation.missingTestExpectations"
    })
  }

  if (draft.metadata.locale === "en" && draftTextValues(draft).some(hasHanText)) {
    warnings.push({
      code: "locale_content_mismatch",
      fieldPath: "metadata.locale",
      messageKey: "validation.localeContentMismatch"
    })
  }

  if (nonBlankItems(draft.agentBoundaries.nonGoals).length === 0) {
    warnings.push({
      code: "missing_non_goals",
      fieldPath: "agentBoundaries.nonGoals",
      messageKey: "validation.missingNonGoals"
    })
  }

  for (const signal of draft.goal.successSignals) {
    const normalized = signal.trim().toLowerCase()
    if (["better", "faster", "更好", "更快", "提升"].includes(normalized)) {
      warnings.push({
        code: "vague_success_signal",
        fieldPath: "goal.successSignals",
        messageKey: "validation.vagueSuccessSignal"
      })
    }
  }

  const openQuestions = nonBlankItems(draft.agentBoundaries.openQuestions)
  if (openQuestions.length > 0) {
    for (const question of openQuestions) {
      warnings.push({
        code: `open_question_${question.slice(0, 10)}`,
        fieldPath: "agentBoundaries.openQuestions",
        message:
          draft.metadata.locale === "zh-TW"
            ? `待釐清問題：${question}`
            : `Open Question: ${question}`
      })
    }
  }

  return { blockingErrors, warnings }
}
