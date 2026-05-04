import type { FeatureDraft, Locale } from "../../model/specTypes"

export type AgentSeedRequest = {
  title: string
  owner?: string
  locale: Locale
  draft?: FeatureDraft | null
}

export function buildAgentSeedRequest({ title, owner, locale, draft }: AgentSeedRequest): string {
  const languageHint = locale === "zh-TW" ? "繁體中文（台灣）" : "English"

  const lines: string[] = [
    "請使用 `.agents/skills/vector-pipeline-b/` 流程協助規劃以下功能：從 stage 1 (Frame) 開始，每個 stage 完成後跑 `bun run methodology:validate`，並把產出檔案路徑回報。",
    "",
    `功能標題：${title}`,
    owner ? `負責人：${owner}` : "負責人：未指定",
    `輸出語言：${languageHint}（locale=${locale}）`,
    "",
    "目標：最終產出 stage 4 的 `<feature-id>.feature-seed.json` 檔案。我會手動把它的內容貼進網頁的 Draft Manager（不需要你自己呼叫匯入 API）。",
    "",
    "不變式（必須遵守）：",
    "1. AI 是 non-authoritative — 推論而非觀察到的需求請放 `agentBoundaries.openQuestions` 或 `risks`，不要寫進 stories / acceptanceCriteria。",
    "2. schemaVersion 沿用 `0.1`（pipeline-b stage 1–3）與 wizard 對齊（feature-seed 採用 wizard 對應版本）。",
    "3. schema keys 維持英文，僅 string 內容隨 locale 翻譯。",
    "4. 若上一個 stage 缺資訊，向我提問，不要捏造。",
    ""
  ]

  if (draft) {
    lines.push(
      "下方是使用者目前已在 wizard 填寫的草稿 snapshot（FeatureDraft JSON），可作為 stage 1 Frame 的輸入線索；空欄位代表尚未填寫，請優先補齊：",
      "",
      "```json",
      JSON.stringify(draft, null, 2),
      "```"
    )
  } else {
    lines.push(
      "目前 wizard 尚無草稿 snapshot，僅有上方標題與負責人；請從這個起點展開 stage 1 Frame。"
    )
  }

  return lines.join("\n")
}
