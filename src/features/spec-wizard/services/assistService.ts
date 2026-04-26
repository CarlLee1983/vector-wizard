import type { FeatureDraft, Locale } from "../model/specTypes";

type AssistMode = "rewrite" | "quality_check";

export type AssistRequest = {
  mode: AssistMode;
  locale: Locale;
  fieldPath?: string;
  text?: string;
  draft?: FeatureDraft;
};

export type AssistResponse = {
  suggestedText?: string;
  rationale?: string;
  warnings: string[];
  assumptions: string[];
  openQuestions: string[];
};

export async function assistDraft(request: AssistRequest): Promise<AssistResponse> {
  if (request.mode === "rewrite") {
    return {
      suggestedText:
        request.locale === "zh-TW"
          ? "釐清登入錯誤提示，讓使用者知道下一步該如何復原。"
          : "Clarify the login error so users understand the next recovery step.",
      rationale:
        request.locale === "zh-TW"
          ? "改寫只整理語意，不新增未確認需求。"
          : "The rewrite clarifies wording without adding unconfirmed requirements.",
      warnings: [],
      assumptions: [],
      openQuestions: []
    };
  }

  const warnings: string[] = [];
  const openQuestions: string[] = [];
  const draft = request.draft;

  if (draft && draft.agentBoundaries.constraints.filter((item) => item.trim()).length === 0) {
    warnings.push(
      request.locale === "zh-TW"
        ? "請加入限制條件，避免 coding agent 過度實作或暴露不安全行為。"
        : "Add constraints so the coding agent does not over-implement or expose unsafe behavior."
    );
    openQuestions.push(
      request.locale === "zh-TW"
        ? "這個功能是否有資安、隱私或法遵限制？"
        : "Are there security, privacy, or compliance constraints for this feature?"
    );
  }

  return {
    rationale:
      request.locale === "zh-TW"
        ? "品質檢查只指出缺漏與風險，不會修改草稿。"
        : "Quality checks identify gaps and risks without changing the draft.",
    warnings,
    assumptions: [],
    openQuestions
  };
}
