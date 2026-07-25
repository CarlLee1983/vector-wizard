import type { FeatureDraft, Locale } from "../model/specTypes"

type AssistMode = "rewrite" | "quality_check"

export type AssistRequest = {
  mode: AssistMode
  locale: Locale
  fieldPath?: string
  text?: string
  draft?: FeatureDraft
}

export type AssistResponse = {
  /**
   * 唯一識別這則建議，用來把後續的採用／拒絕結果對回到它身上。只有 rewrite 模式
   * （會產出可採納的 suggestedText）才有；quality_check 不是可採納的建議，故無此欄位。
   * 這是這條校準鏈裡唯一「事後補不回來」的部分——歷史建議無從回填 id，所以由產生端
   * （目前是 mock，未來是真實 LLM）在產出當下就打上。
   */
  suggestionId?: string
  suggestedText?: string
  rationale?: string
  warnings: string[]
  assumptions: string[]
  openQuestions: string[]
}

function generateSuggestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export async function assistDraft(request: AssistRequest): Promise<AssistResponse> {
  if (request.mode === "rewrite") {
    return {
      suggestionId: generateSuggestionId(),
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
    }
  }

  const warnings: string[] = []
  const openQuestions: string[] = []
  const draft = request.draft

  if (draft && draft.agentBoundaries.constraints.filter((item) => item.trim()).length === 0) {
    warnings.push(
      request.locale === "zh-TW"
        ? "請加入限制條件，避免 coding agent 過度實作或暴露不安全行為。"
        : "Add constraints so the coding agent does not over-implement or expose unsafe behavior."
    )
    openQuestions.push(
      request.locale === "zh-TW"
        ? "這個功能是否有資安、隱私或法遵限制？"
        : "Are there security, privacy, or compliance constraints for this feature?"
    )
  }

  return {
    rationale:
      request.locale === "zh-TW"
        ? "品質檢查只指出缺漏與風險，不會修改草稿。"
        : "Quality checks identify gaps and risks without changing the draft.",
    warnings,
    assumptions: [],
    openQuestions
  }
}
