import type { FeatureDraft } from "../../../model/specTypes"

export function storiesGapsTemplate({ draft }: { draft: FeatureDraft }): string {
  const story = draft.epics?.[0]?.stories?.[0]
  const locale = draft.metadata.locale ?? "zh-TW"
  const localeInstruction = locale === "en" ? "Respond in English." : "請以繁體中文作答。"
  return [
    "你是一個敏捷產品教練，協助找出 user story 中可能遺漏的角色與場景。",
    `Goal：${draft.goal.statement || "(未填)"}`,
    `現有 user story：「${story?.userStory ?? "(未填)"}」`,
    "",
    "請列出這條 story 可能漏掉的角色（actor）或場景（scenario）。最多 5 條，每條一句話。",
    "若該 story 看起來已經足夠完整，回 1 條 severity 為 info 的條目，說明覆蓋良好的理由。",
    localeInstruction,
    "",
    "請僅輸出一個 fenced code block，標記為 vector-action，內容符合下列 schema：",
    "",
    "```vector-action",
    JSON.stringify(
      {
        notes: [{ severity: "warning", text: "..." }]
      },
      null,
      2
    ),
    "```",
    "",
    "severity 只能是 info 或 warning。不要其他輸出。"
  ].join("\n")
}
