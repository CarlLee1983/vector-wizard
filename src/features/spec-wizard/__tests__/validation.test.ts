import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "../model/defaultDraft";
import { validateDraft } from "../model/validation";
import { minimalValidDraft } from "../test/fixtures";

describe("validateDraft", () => {
  it("accepts a minimal valid draft", () => {
    const result = validateDraft(minimalValidDraft());

    expect(result.blockingErrors).toEqual([]);
    expect(result.warnings.map((warning) => warning.code)).toContain("story_missing_acceptance_criteria");
    expect(result.warnings.map((warning) => warning.code)).toContain("story_missing_examples");
  });

  it("blocks missing title", () => {
    const draft = minimalValidDraft();
    draft.metadata.title = "";

    const result = validateDraft(draft);

    expect(result.blockingErrors).toContainEqual({
      code: "missing_title",
      fieldPath: "metadata.title",
      messageKey: "validation.missingTitle"
    });
  });

  it("blocks missing goal statement", () => {
    const draft = minimalValidDraft();
    draft.goal.statement = "   ";

    const result = validateDraft(draft);

    expect(result.blockingErrors).toContainEqual({
      code: "missing_goal",
      fieldPath: "goal.statement",
      messageKey: "validation.missingGoal"
    });
  });

  it("blocks drafts without stories", () => {
    const draft = minimalValidDraft();
    draft.epics = [{ id: "EP-001", title: "Empty epic", stories: [] }];

    const result = validateDraft(draft);

    expect(result.blockingErrors).toContainEqual({
      code: "missing_story",
      fieldPath: "epics",
      messageKey: "validation.missingStory"
    });
  });

  it("returns warnings for missing boundaries", () => {
    const result = validateDraft(minimalValidDraft());

    expect(result.warnings.map((warning) => warning.code)).toContain("missing_constraints");
    expect(result.warnings.map((warning) => warning.code)).toContain("missing_non_goals");
  });

  it("creates an empty draft with a starter epic and story", () => {
    const draft = createEmptyDraft("zh-TW");

    expect(draft.metadata.locale).toBe("zh-TW");
    expect(draft.epics).toHaveLength(1);
    expect(draft.epics[0].stories).toHaveLength(1);
  });
});
