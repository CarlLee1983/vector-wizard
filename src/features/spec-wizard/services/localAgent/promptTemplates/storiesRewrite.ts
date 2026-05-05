import type { FeatureDraft } from "../../../model/specTypes"

export function storiesRewriteTemplate({ draft }: { draft: FeatureDraft }): string {
  const story = draft.epics?.[0]?.stories?.[0]
  if (!story) {
    throw new Error("storiesRewriteTemplate requires epics[0].stories[0] to exist")
  }
  const locale = draft.metadata.locale ?? "zh-TW"
  const localeInstruction = locale === "en" ? "Respond in English." : "請以繁體中文（zh-TW）作答。"
  return [
    "你是一個敏捷產品教練，協助使用者改寫 user story 使其更精確、可驗證。",
    `Feature 標題：${draft.metadata.title || "(未填)"}`,
    `Goal：${draft.goal.statement || "(未填)"}`,
    `Story 標題：${story.title || "(未填)"}`,
    `現有 user story：「${story.userStory}」`,
    "",
    "請改寫這條 user story，要求：",
    "1. 遵循「身為 X，我想要 Y，以便 Z」結構",
    "2. 角色（X）具體（避免「使用者」這種泛稱）",
    "3. 動機（Z）連結到 Goal",
    localeInstruction,
    "",
    "請僅輸出一個 fenced code block，標記為 vector-action，內容符合下列 schema：",
    "",
    "```vector-action",
    JSON.stringify(
      {
        preview: {
          text: "...",
          targetPath: "epics[0].stories[0].userStory",
          mode: "replace"
        }
      },
      null,
      2
    ),
    "```",
    "",
    "不要有其他輸出、不要解釋、不要 markdown。"
  ].join("\n")
}
