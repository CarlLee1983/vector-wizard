import type { FeatureDraft } from "../../../model/specTypes"

export function storiesConsistencyTemplate({ draft }: { draft: FeatureDraft }): string {
  const story = draft.epics?.[0]?.stories?.[0]
  const ac = story?.acceptanceCriteria ?? []
  const acText = ac.length === 0 ? "(尚未填寫)" : ac.map((c, i) => `${i + 1}. ${c.statement}`).join("\n")
  const locale = draft.metadata.locale ?? "zh-TW"
  const localeInstruction = locale === "en" ? "Respond in English." : "請以繁體中文作答。"
  return [
    "你是一個敏捷產品教練，協助對齊 Goal、User Story、Acceptance Criteria 三者的一致性。",
    `Goal：${draft.goal.statement || "(未填)"}`,
    `User Story：「${story?.userStory ?? "(未填)"}」`,
    `Acceptance Criteria：`,
    acText,
    "",
    "請列出這三者之間的不一致或斷層（最多 5 條）。每條須點出具體欄位。",
    "若三者一致，回 1 條 severity 為 info 的條目說明對齊狀況。",
    localeInstruction,
    "",
    "請僅輸出一個 fenced code block，標記為 vector-action：",
    "",
    "```vector-action",
    JSON.stringify(
      {
        notes: [{ severity: "warning", text: "...", ref: "epics[0].stories[0]" }]
      },
      null,
      2
    ),
    "```",
    "",
    "severity 只能是 info 或 warning。"
  ].join("\n")
}
