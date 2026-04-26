import type { Locale } from "../model/specTypes";

export type MessageKey =
  | "wizard.title"
  | "wizard.subtitle"
  | "wizard.next"
  | "wizard.previous"
  | "wizard.review"
  | "wizard.exportYaml"
  | "wizard.copyYaml"
  | "wizard.importDraft"
  | "wizard.exportDraft"
  | "field.title"
  | "field.owner"
  | "field.problem"
  | "field.desiredOutcome"
  | "field.goal"
  | "field.successSignals"
  | "field.storyTitle"
  | "field.userStory"
  | "field.constraints"
  | "field.nonGoals"
  | "validation.missingTitle"
  | "validation.missingGoal"
  | "validation.missingStory"
  | "validation.storyMissingAcceptanceCriteria"
  | "validation.storyMissingExamples"
  | "validation.missingConstraints"
  | "validation.missingNonGoals"
  | "validation.vagueSuccessSignal"
  | "validation.openQuestionsPresent";

export const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  "zh-TW": {
    "wizard.title": "敏捷開發路徑 Wizard",
    "wizard.subtitle": "把產品想法轉成可 review、可交給 AI coding agent 的 YAML 規格。",
    "wizard.next": "下一步",
    "wizard.previous": "上一步",
    "wizard.review": "檢視與匯出",
    "wizard.exportYaml": "下載 YAML",
    "wizard.copyYaml": "複製 YAML",
    "wizard.importDraft": "匯入草稿 JSON",
    "wizard.exportDraft": "匯出草稿 JSON",
    "field.title": "功能名稱",
    "field.owner": "負責人",
    "field.problem": "問題背景",
    "field.desiredOutcome": "期望成果",
    "field.goal": "目標",
    "field.successSignals": "成功訊號",
    "field.storyTitle": "故事標題",
    "field.userStory": "使用者故事",
    "field.constraints": "限制",
    "field.nonGoals": "非目標",
    "validation.missingTitle": "請填寫功能名稱。",
    "validation.missingGoal": "請填寫目標。",
    "validation.missingStory": "請至少填寫一個使用者故事。",
    "validation.storyMissingAcceptanceCriteria": "故事缺少驗收條件。",
    "validation.storyMissingExamples": "故事缺少範例。",
    "validation.missingConstraints": "建議補充限制條件。",
    "validation.missingNonGoals": "建議補充非目標。",
    "validation.vagueSuccessSignal": "成功訊號可能過於模糊。",
    "validation.openQuestionsPresent": "仍有未解問題。"
  },
  en: {
    "wizard.title": "Agile Roadmap Wizard",
    "wizard.subtitle": "Turn product ideas into reviewable YAML specs for AI coding agents.",
    "wizard.next": "Next",
    "wizard.previous": "Previous",
    "wizard.review": "Review and Export",
    "wizard.exportYaml": "Download YAML",
    "wizard.copyYaml": "Copy YAML",
    "wizard.importDraft": "Import Draft JSON",
    "wizard.exportDraft": "Export Draft JSON",
    "field.title": "Feature title",
    "field.owner": "Owner",
    "field.problem": "Problem background",
    "field.desiredOutcome": "Desired outcome",
    "field.goal": "Goal",
    "field.successSignals": "Success signals",
    "field.storyTitle": "Story title",
    "field.userStory": "User story",
    "field.constraints": "Constraints",
    "field.nonGoals": "Non-goals",
    "validation.missingTitle": "Enter a feature title.",
    "validation.missingGoal": "Enter a goal.",
    "validation.missingStory": "Enter at least one user story.",
    "validation.storyMissingAcceptanceCriteria": "Story is missing acceptance criteria.",
    "validation.storyMissingExamples": "Story is missing examples.",
    "validation.missingConstraints": "Add constraints if any apply.",
    "validation.missingNonGoals": "Add non-goals if any apply.",
    "validation.vagueSuccessSignal": "Success signal may be too vague.",
    "validation.openQuestionsPresent": "Open questions remain."
  }
};
