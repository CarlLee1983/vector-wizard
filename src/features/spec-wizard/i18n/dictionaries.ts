import type { Locale } from "../model/specTypes"

export type MessageKey =
  | "wizard.title"
  | "wizard.subtitle"
  | "wizard.next"
  | "wizard.previous"
  | "wizard.review"
  | "wizard.reviewCta"
  | "wizard.reviewHelp"
  | "wizard.exportYaml"
  | "wizard.copyYaml"
  | "wizard.importDraft"
  | "wizard.exportDraft"
  | "wizard.addItem"
  | "wizard.aiAssist"
  | "wizard.aiAssisting"
  | "wizard.aiAssistDone"
  | "review.summary"
  | "review.yaml"
  | "step.basic"
  | "step.goal"
  | "step.context"
  | "step.deliverables"
  | "step.stories"
  | "step.criteria"
  | "step.examples"
  | "step.boundaries"
  | "step.review"
  | "field.title"
  | "field.titleHelp"
  | "field.titlePlaceholder"
  | "field.owner"
  | "field.ownerHelp"
  | "field.ownerPlaceholder"
  | "field.problem"
  | "field.problemHelp"
  | "field.problemPlaceholder"
  | "field.desiredOutcome"
  | "field.desiredOutcomeHelp"
  | "field.desiredOutcomePlaceholder"
  | "field.goal"
  | "field.goalHelp"
  | "field.goalPlaceholder"
  | "field.successSignals"
  | "field.successSignalsHelp"
  | "field.successSignalsPlaceholder"
  | "field.storyTitle"
  | "field.storyTitleHelp"
  | "field.storyTitlePlaceholder"
  | "field.userStory"
  | "field.userStoryHelp"
  | "field.userStoryPlaceholder"
  | "field.epicTitle"
  | "field.epicTitleHelp"
  | "field.epicTitlePlaceholder"
  | "field.impactActor"
  | "field.impactActorHelp"
  | "field.impactActorPlaceholder"
  | "field.impact"
  | "field.impactHelp"
  | "field.impactPlaceholder"
  | "field.userActivityActor"
  | "field.userActivityActorHelp"
  | "field.userActivityActorPlaceholder"
  | "field.userActivity"
  | "field.userActivityHelp"
  | "field.userActivityPlaceholder"
  | "field.deliverableName"
  | "field.deliverableNameHelp"
  | "field.deliverableNamePlaceholder"
  | "field.deliverableDescription"
  | "field.deliverableDescriptionHelp"
  | "field.deliverableDescriptionPlaceholder"
  | "field.acceptanceCriteria"
  | "field.acceptanceCriteriaHelp"
  | "field.acceptanceCriteriaPlaceholder"
  | "field.exampleScenario"
  | "field.exampleScenarioHelp"
  | "field.exampleScenarioPlaceholder"
  | "field.given"
  | "field.givenHelp"
  | "field.givenPlaceholder"
  | "field.when"
  | "field.whenHelp"
  | "field.whenPlaceholder"
  | "field.then"
  | "field.thenHelp"
  | "field.thenPlaceholder"
  | "field.testExpectations"
  | "field.testExpectationsHelp"
  | "field.testExpectationsPlaceholder"
  | "field.constraints"
  | "field.constraintsHelp"
  | "field.constraintsPlaceholder"
  | "field.nonGoals"
  | "field.nonGoalsHelp"
  | "field.nonGoalsPlaceholder"
  | "validation.missingTitle"
  | "validation.missingGoal"
  | "validation.missingStory"
  | "validation.storyMissingAcceptanceCriteria"
  | "validation.storyMissingExamples"
  | "validation.missingSuccessSignals"
  | "validation.missingImpacts"
  | "validation.missingDeliverables"
  | "validation.missingUserActivities"
  | "validation.missingEpicTitle"
  | "validation.missingTestExpectations"
  | "validation.localeContentMismatch"
  | "validation.missingConstraints"
  | "validation.missingNonGoals"
  | "validation.vagueSuccessSignal"
  | "validation.openQuestionsPresent"
  | "reviewPrompt.section.title"
  | "reviewPrompt.section.description"
  | "reviewPrompt.button.idle"
  | "reviewPrompt.button.copied"
  | "reviewPrompt.button.failed"
  | "reviewPrompt.fallback.label"
  | "reviewPrompt.template"
  | "seedPrompt.title"
  | "seedPrompt.help"
  | "seedPrompt.button.idle"
  | "seedPrompt.button.copied"
  | "seedPrompt.button.failed"
  | "draftSwitcher.label"
  | "draftSwitcher.untitled"
  | "draftSwitcher.new"
  | "draftSwitcher.manage"
  | "draftSwitcher.empty"
  | "draftManager.title"
  | "draftManager.import"
  | "draftManager.importError"
  | "draftManager.export"
  | "draftManager.delete"
  | "draftManager.rename"
  | "draftManager.updatedAt"
  | "draftManager.paste"
  | "draftManager.pastePlaceholder"
  | "draftManager.pasteSubmit"
  | "confirm.deleteDraft.title"
  | "confirm.deleteDraft.message"
  | "confirm.confirm"
  | "confirm.cancel"
  | "empty.title"
  | "empty.subtitle"
  | "empty.cta"
  | "autosave.error"
  | "autosave.dismiss"

export const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  "zh-TW": {
    "wizard.title": "敏捷開發路徑 Wizard",
    "wizard.subtitle": "把產品想法轉成可 review、可交給 AI coding agent 的 YAML 規格。",
    "wizard.next": "下一步",
    "wizard.previous": "上一步",
    "wizard.review": "檢視與匯出",
    "wizard.reviewCta": "前往檢視與匯出",
    "wizard.reviewHelp": "先確認摘要是否像要交給工程與 AI coding agent 的需求，再複製或下載 YAML。",
    "wizard.exportYaml": "下載 YAML",
    "wizard.copyYaml": "複製 YAML",
    "wizard.importDraft": "匯入草稿 JSON",
    "wizard.exportDraft": "匯出草稿 JSON",
    "wizard.addItem": "新增項目",
    "wizard.aiAssist": "AI 輔助優化",
    "wizard.aiAssisting": "AI 思考中...",
    "wizard.aiAssistDone": "優化完成 ✨",
    "review.summary": "摘要內容",
    "review.yaml": "YAML 源碼",
    "step.basic": "基本資訊",
    "step.goal": "目標與影響",
    "step.context": "影響與活動",
    "step.deliverables": "交付項目",
    "step.stories": "使用者故事",
    "step.criteria": "驗收條件",
    "step.examples": "範例情境",
    "step.boundaries": "限制與風險",
    "step.review": "檢視與匯出",
    "field.title": "功能標題（一句話說明要做什麼）",
    "field.titleHelp": "請填「這次要交付的功能或改善」，不是專案名稱；例如：會員登入錯誤提示優化。",
    "field.titlePlaceholder": "例：會員登入錯誤提示優化",
    "field.owner": "負責人",
    "field.ownerHelp": "填主要決策或驗收窗口，方便後續確認需求；可以是姓名、角色或團隊。",
    "field.ownerPlaceholder": "例：PM Team、產品負責人 Annie",
    "field.problem": "問題背景",
    "field.problemHelp": "描述現在卡在哪裡、誰受影響、為什麼值得處理。",
    "field.problemPlaceholder": "例：登入錯誤訊息太籠統，使用者不知道帳密錯誤後該怎麼修正。",
    "field.desiredOutcome": "期望成果",
    "field.desiredOutcomeHelp": "描述完成後希望使用者或業務狀態變成什麼樣子。",
    "field.desiredOutcomePlaceholder": "例：降低登入失敗後的客服詢問，讓使用者能自行修正。",
    "field.goal": "目標",
    "field.goalHelp": "用一句可驗收的目標說明本次交付要達成什麼。",
    "field.goalPlaceholder": "例：讓使用者在登入失敗時知道下一步該怎麼做。",
    "field.successSignals": "成功訊號",
    "field.successSignalsHelp": "列出可觀察的成功跡象；可以是數據、行為或驗收判斷。",
    "field.successSignalsPlaceholder": "例：登入失敗相關客服量下降",
    "field.storyTitle": "使用者故事標題（一句話描述情境）",
    "field.storyTitleHelp": "請填這則故事要解決的使用者情境；例如：顯示安全的登入失敗提示。",
    "field.storyTitlePlaceholder": "例：顯示安全的登入失敗提示",
    "field.userStory": "使用者故事",
    "field.userStoryHelp": "用「作為⋯我想要⋯以便⋯」描述角色、需求與價值。",
    "field.userStoryPlaceholder": "例：作為會員，我想看到清楚提示，以便知道如何修正登入問題。",
    "field.epicTitle": "Epic 標題",
    "field.epicTitleHelp": "把相關故事群組成一個能力或流程階段；例如：刀具資產管理。",
    "field.epicTitlePlaceholder": "例：刀具資產管理",
    "field.impactActor": "受影響角色",
    "field.impactActorHelp": "誰的工作或決策會被這次功能改善。",
    "field.impactActorPlaceholder": "例：機台管理人員",
    "field.impact": "影響",
    "field.impactHelp": "描述此角色會得到的具體改善。",
    "field.impactPlaceholder": "例：能掌握刀具狀態與責任歸屬",
    "field.userActivityActor": "使用者活動角色",
    "field.userActivityActorHelp": "執行此活動的主要角色。",
    "field.userActivityActorPlaceholder": "例：機台管理人員",
    "field.userActivity": "使用者活動",
    "field.userActivityHelp": "描述使用者在系統中要完成的流程或任務。",
    "field.userActivityPlaceholder": "例：登錄刀具採購、領用、停用流程",
    "field.deliverableName": "交付項目名稱",
    "field.deliverableNameHelp": "這次要交付給使用者或工程實作的主要能力。",
    "field.deliverableNamePlaceholder": "例：刀具生命週期管理",
    "field.deliverableDescription": "交付項目描述",
    "field.deliverableDescriptionHelp": "補充此交付項目包含哪些可驗收內容。",
    "field.deliverableDescriptionPlaceholder": "例：建立刀具資料、狀態追蹤與紀錄查詢",
    "field.acceptanceCriteria": "驗收條件",
    "field.acceptanceCriteriaHelp": "列出工程完成後必須符合的可驗收規則。",
    "field.acceptanceCriteriaPlaceholder": "例：每支刀具必須有唯一財產編號",
    "field.exampleScenario": "範例情境",
    "field.exampleScenarioHelp": "用一個具體情境說明輸入、行為與預期結果。",
    "field.exampleScenarioPlaceholder": "例：當管理人員新增刀具並輸入財產編號後，系統會顯示該刀具為可使用。",
    "field.given": "假設 (Given)",
    "field.givenHelp": "描述測試開始前的系統狀態或前提條件。",
    "field.givenPlaceholder": "例：系統中已有一把編號為 T001 的刀具",
    "field.when": "當...時 (When)",
    "field.whenHelp": "觸發此情境的關鍵動作或事件。",
    "field.whenPlaceholder": "例：管理人員將該刀具標記為「報廢」",
    "field.then": "接著 (Then)",
    "field.thenHelp": "預期發生的結果或狀態變遷。",
    "field.thenPlaceholder": "例：該刀具狀態變更為 Retired，且成本分攤至該機台專案",
    "field.testExpectations": "測試期望",
    "field.testExpectationsHelp": "列出 AI coding agent 應補上的測試或驗證方式。",
    "field.testExpectationsPlaceholder": "例：新增重複財產編號的驗證測試",
    "field.constraints": "限制",
    "field.constraintsHelp": "列出工程或產品上不能違反的規則，避免實作走錯方向。",
    "field.constraintsPlaceholder": "例：不可透露帳號是否存在、不可新增第三方登入",
    "field.nonGoals": "非目標",
    "field.nonGoalsHelp": "明確寫出這次不做什麼，避免需求範圍擴大。",
    "field.nonGoalsPlaceholder": "例：不重做整個登入頁、不新增社群登入",
    "validation.missingTitle": "請填寫功能名稱。",
    "validation.missingGoal": "請填寫目標。",
    "validation.missingStory": "請至少填寫一個使用者故事。",
    "validation.storyMissingAcceptanceCriteria": "故事缺少驗收條件。",
    "validation.storyMissingExamples": "故事缺少範例。",
    "validation.missingSuccessSignals": "建議補充可觀察的成功訊號。",
    "validation.missingImpacts": "建議補充受影響角色與影響。",
    "validation.missingDeliverables": "建議補充交付項目。",
    "validation.missingUserActivities": "建議補充使用者活動或流程。",
    "validation.missingEpicTitle": "建議補充 Epic 標題，讓故事群組更清楚。",
    "validation.missingTestExpectations": "建議補充測試期望，方便 AI coding agent 驗證。",
    "validation.localeContentMismatch": "內容看起來是中文，但語言設定為 English；請確認語言設定是否正確。",
    "validation.missingConstraints": "建議補充限制條件。",
    "validation.missingNonGoals": "建議補充非目標。",
    "validation.vagueSuccessSignal": "成功訊號可能過於模糊。",
    "validation.openQuestionsPresent": "仍有未解問題。",
    "reviewPrompt.section.title": "AI 審閱協助",
    "reviewPrompt.section.description":
      "複製後可貼到 Claude Code、ChatGPT 等 AI agent，請其針對本 spec 提出改良建議。AI 不會直接修改本草稿。",
    "reviewPrompt.button.idle": "複製 AI 審閱 prompt",
    "reviewPrompt.button.copied": "已複製 ✓",
    "reviewPrompt.button.failed": "複製失敗，請手動複製",
    "reviewPrompt.fallback.label": "Prompt 內容（可手動全選複製）",
    "reviewPrompt.template": `# 規格審閱請求

你是一位資深產品/工程顧問，專長是為 AI coding agent 撰寫的功能規格做品質審閱。

## 任務

請針對下方功能規格給出改良建議。請**只給審閱回饋**，不要直接撰寫程式碼或重新撰寫規格。所有建議都要對應到下方 checklist 中的某個維度，並指出 spec 中具體位置（例如 \`productSpec.goal.statement\`、\`epics[0].stories[0].acceptanceCriteria\`）以利原作者回到編輯器修正對應欄位。

## 審閱維度（請對每一項給出「評估」與「具體建議」）

1. **目標清晰度（Goal clarity）**：\`goal.statement\` 是否清楚描述「為誰、解決什麼問題、達到什麼狀態」？\`successSignals\` 是否實際可量測？
2. **使用者故事完整性（Story completeness）**：每個 story 的 \`userStory\` 是否包含角色、想做什麼、為什麼？標題與內文是否一致？
3. **驗收條件可測性（Acceptance criteria testability）**：每條 AC 是否可直接轉成自動化測試？是否避免主觀字眼（「好用」、「合理」、「順暢」）？
4. **範例邊界涵蓋（Example coverage）**：examples 是否涵蓋 happy path、邊界情況、錯誤情境？given/when/then 是否完整？
5. **Agent 邊界充分性（Agent boundary sufficiency）**：\`agentSpec\` 中的 \`nonGoals\`、\`constraints\`、\`risks\` 是否足以避免 AI coding agent 過度實作、超出範圍、或產生不安全行為？
6. **區段間一致性（Cross-section consistency）**：\`goal\` 與 \`stories\` 是否對齊？\`impacts\` 中提到的 actor 是否在 \`stories\` 或 \`userActivities\` 中也有出現？\`constraints\` 是否與任何 story 互相抵觸？

## 回應格式

請依下列格式回覆，每個維度一段：

### 1. 目標清晰度
- 評估：（一兩句）
- 建議：（條列，每條附 spec 位置）

（依此類推到第 6 項）

### 整體優先順序
最後請列出你認為最該優先修正的 3 項。

---

## Spec 內容

### 人類摘要

{{summary_markdown}}

### YAML

\`\`\`yaml
{{yaml_content}}
\`\`\`
`,
    "seedPrompt.title": "AI 快速生成草稿",
    "seedPrompt.help": "不知道怎麼開始？輸入功能標題後，複製下方 Prompt 給外部 AI (如 Claude)，它會幫你生成一份完整的 JSON 草稿，匯入後即可開始編輯。",
    "seedPrompt.button.idle": "複製 AI 生成 Prompt",
    "seedPrompt.button.copied": "已複製 ✓",
    "seedPrompt.button.failed": "複製失敗",
    "draftSwitcher.label": "目前草稿",
    "draftSwitcher.untitled": "未命名草稿",
    "draftSwitcher.new": "+ 新增草稿",
    "draftSwitcher.manage": "⚙ 管理",
    "draftSwitcher.empty": "+ 開始第一個草稿",
    "draftManager.title": "草稿管理",
    "draftManager.import": "匯入 JSON",
    "draftManager.importError": "匯入失敗：JSON 格式不正確",
    "draftManager.export": "匯出 JSON",
    "draftManager.delete": "刪除",
    "draftManager.rename": "重新命名",
    "draftManager.updatedAt": "上次更新",
    "draftManager.paste": "直接貼上 JSON",
    "draftManager.pastePlaceholder": "請在此貼上 AI 生成的 JSON 物件...",
    "draftManager.pasteSubmit": "確認匯入",
    "confirm.deleteDraft.title": "確定刪除草稿？",
    "confirm.deleteDraft.message": "確定刪除此草稿？此動作無法還原。",
    "confirm.confirm": "確定",
    "confirm.cancel": "取消",
    "empty.title": "歡迎",
    "empty.subtitle": "開始你的第一個想法",
    "empty.cta": "+ 新增草稿",
    "autosave.error": "自動存檔失敗，請匯出 JSON 備份",
    "autosave.dismiss": "知道了"
  },
  en: {
    "wizard.title": "Agile Roadmap Wizard",
    "wizard.subtitle": "Turn product ideas into reviewable YAML specs for AI coding agents.",
    "wizard.next": "Next",
    "wizard.previous": "Previous",
    "wizard.review": "Review and Export",
    "wizard.reviewCta": "Go to Review and Export",
    "wizard.reviewHelp":
      "Check that the summary reads like a handoff for engineers and AI coding agents, then copy or download YAML.",
    "wizard.exportYaml": "Download YAML",
    "wizard.copyYaml": "Copy YAML",
    "wizard.importDraft": "Import Draft JSON",
    "wizard.exportDraft": "Export Draft JSON",
    "wizard.addItem": "Add Item",
    "wizard.aiAssist": "AI Assist",
    "wizard.aiAssisting": "AI Thinking...",
    "wizard.aiAssistDone": "Optimized ✨",
    "review.summary": "Summary",
    "review.yaml": "YAML Source",
    "step.basic": "Basic",
    "step.goal": "Goal & Impact",
    "step.context": "Context & Activity",
    "step.deliverables": "Deliverables",
    "step.stories": "User Stories",
    "step.criteria": "Criteria",
    "step.examples": "Examples",
    "step.boundaries": "Boundaries",
    "step.review": "Review",
    "field.title": "Feature title (one sentence about what to build)",
    "field.titleHelp":
      "Enter the feature or improvement being delivered, not the project name; e.g. Improve login error messages.",
    "field.titlePlaceholder": "e.g. Improve login error messages",
    "field.owner": "Owner",
    "field.ownerHelp": "Enter the main decision maker or acceptance contact; a name, role, or team is fine.",
    "field.ownerPlaceholder": "e.g. PM Team, Product Owner Annie",
    "field.problem": "Problem background",
    "field.problemHelp": "Describe what is not working today, who is affected, and why it is worth fixing.",
    "field.problemPlaceholder": "e.g. Login errors are too vague, so users do not know how to recover.",
    "field.desiredOutcome": "Desired outcome",
    "field.desiredOutcomeHelp": "Describe what should be better for users or the business after this ships.",
    "field.desiredOutcomePlaceholder": "e.g. Reduce support tickets after failed login attempts.",
    "field.goal": "Goal",
    "field.goalHelp": "Write one testable sentence for what this delivery should achieve.",
    "field.goalPlaceholder": "e.g. Help users understand what to do after a failed login.",
    "field.successSignals": "Success signals",
    "field.successSignalsHelp": "List observable signs of success; metrics, behaviors, or review checks are all OK.",
    "field.successSignalsPlaceholder": "e.g. Fewer support tickets related to failed login",
    "field.storyTitle": "User story title (one sentence about the scenario)",
    "field.storyTitleHelp": "Enter the user scenario this story solves; e.g. Show a safe failed-login message.",
    "field.storyTitlePlaceholder": "e.g. Show a safe failed-login message",
    "field.userStory": "User story",
    "field.userStoryHelp": "Use “As a..., I want..., so that...” to describe role, need, and value.",
    "field.userStoryPlaceholder": "e.g. As a member, I want clear guidance so that I can fix login problems.",
    "field.epicTitle": "Epic title",
    "field.epicTitleHelp": "Group related stories into one capability or workflow stage; e.g. Tool asset management.",
    "field.epicTitlePlaceholder": "e.g. Tool asset management",
    "field.impactActor": "Impacted actor",
    "field.impactActorHelp": "Who will have their work or decisions improved by this feature.",
    "field.impactActorPlaceholder": "e.g. Machine manager",
    "field.impact": "Impact",
    "field.impactHelp": "Describe the concrete improvement this actor receives.",
    "field.impactPlaceholder": "e.g. Can track tool status and accountability",
    "field.userActivityActor": "User activity actor",
    "field.userActivityActorHelp": "The main role performing this activity.",
    "field.userActivityActorPlaceholder": "e.g. Machine manager",
    "field.userActivity": "User activity",
    "field.userActivityHelp": "Describe the workflow or task the user needs to complete.",
    "field.userActivityPlaceholder": "e.g. Record tool purchase, assignment, and retirement",
    "field.deliverableName": "Deliverable name",
    "field.deliverableNameHelp": "The main capability being delivered to users or engineering.",
    "field.deliverableNamePlaceholder": "e.g. Tool lifecycle management",
    "field.deliverableDescription": "Deliverable description",
    "field.deliverableDescriptionHelp": "Clarify what acceptance-ready content this deliverable includes.",
    "field.deliverableDescriptionPlaceholder": "e.g. Tool records, status tracking, and history lookup",
    "field.acceptanceCriteria": "Acceptance criteria",
    "field.acceptanceCriteriaHelp": "List testable rules that must be true when engineering is done.",
    "field.acceptanceCriteriaPlaceholder": "e.g. Each tool must have a unique asset number",
    "field.exampleScenario": "Example scenario",
    "field.exampleScenarioHelp": "Describe one concrete input, behavior, and expected result.",
    "field.exampleScenarioPlaceholder":
      "e.g. When a manager creates a tool with an asset number, the system shows it as available.",
    "field.given": "Given",
    "field.givenHelp": "Describe the initial state or preconditions before the action.",
    "field.givenPlaceholder": "e.g. A tool with ID T001 exists in the system",
    "field.when": "When",
    "field.whenHelp": "The key action or event that triggers the scenario.",
    "field.whenPlaceholder": "e.g. The manager marks the tool as 'Retired'",
    "field.then": "Then",
    "field.thenHelp": "The expected outcome or state change.",
    "field.thenPlaceholder": "e.g. Tool status changes to Retired and cost is allocated to the project",
    "field.testExpectations": "Test expectations",
    "field.testExpectationsHelp": "List tests or checks the AI coding agent should add.",
    "field.testExpectationsPlaceholder": "e.g. Add validation tests for duplicate asset numbers",
    "field.constraints": "Constraints",
    "field.constraintsHelp": "List product or engineering rules the implementation must not violate.",
    "field.constraintsPlaceholder": "e.g. Do not reveal whether an account exists",
    "field.nonGoals": "Non-goals",
    "field.nonGoalsHelp": "Write what is intentionally out of scope so the request does not expand.",
    "field.nonGoalsPlaceholder": "e.g. Do not rebuild the whole login page",
    "validation.missingTitle": "Enter a feature title.",
    "validation.missingGoal": "Enter a goal.",
    "validation.missingStory": "Enter at least one user story.",
    "validation.storyMissingAcceptanceCriteria": "Story is missing acceptance criteria.",
    "validation.storyMissingExamples": "Story is missing examples.",
    "validation.missingSuccessSignals": "Add observable success signals.",
    "validation.missingImpacts": "Add impacted actors and impacts.",
    "validation.missingDeliverables": "Add deliverables.",
    "validation.missingUserActivities": "Add user activities or workflow steps.",
    "validation.missingEpicTitle": "Add an epic title so the story group is clear.",
    "validation.missingTestExpectations": "Add test expectations so the AI coding agent can verify the work.",
    "validation.localeContentMismatch":
      "Content appears to be Chinese, but locale is English; confirm the language setting.",
    "validation.missingConstraints": "Add constraints if any apply.",
    "validation.missingNonGoals": "Add non-goals if any apply.",
    "validation.vagueSuccessSignal": "Success signal may be too vague.",
    "validation.openQuestionsPresent": "Open questions remain.",
    "reviewPrompt.section.title": "AI Review Assistance",
    "reviewPrompt.section.description":
      "Copy and paste into any AI agent (Claude Code, ChatGPT, etc.) to request feedback on this spec. AI will not modify this draft directly.",
    "reviewPrompt.button.idle": "Copy AI Review Prompt",
    "reviewPrompt.button.copied": "Copied ✓",
    "reviewPrompt.button.failed": "Copy failed, please copy manually",
    "reviewPrompt.fallback.label": "Prompt content (select all to copy manually)",
    "reviewPrompt.template": `# Spec Review Request

You are a senior product/engineering reviewer specializing in feature specifications written for AI coding agents.

## Task

Review the feature spec below and provide improvement suggestions. Provide **review feedback only** — do not write code or rewrite the spec yourself. Every suggestion must map to one of the dimensions in the checklist and reference the exact spec location (e.g., \`productSpec.goal.statement\`, \`epics[0].stories[0].acceptanceCriteria\`) so the author can edit the corresponding field.

## Review dimensions (provide an "assessment" and "concrete suggestions" for each)

1. **Goal clarity**: Does \`goal.statement\` clearly describe who, what problem, and what end state? Are \`successSignals\` actually measurable?
2. **Story completeness**: Does each story's \`userStory\` include role, want, and reason? Are title and body aligned?
3. **Acceptance criteria testability**: Can each AC be directly translated into an automated test? Does it avoid subjective wording ("good", "reasonable", "smooth")?
4. **Example coverage**: Do examples cover happy path, boundaries, and error cases? Are given/when/then complete?
5. **Agent boundary sufficiency**: Are \`agentSpec.nonGoals\`, \`constraints\`, and \`risks\` enough to prevent over-implementation, scope creep, or unsafe behavior by AI coding agents?
6. **Cross-section consistency**: Do \`goal\` and \`stories\` align? Do actors mentioned in \`impacts\` also appear in \`stories\` or \`userActivities\`? Do \`constraints\` conflict with any story?

## Response format

Reply in the following structure, one section per dimension:

### 1. Goal clarity
- Assessment: (one or two sentences)
- Suggestions: (bullet list, each with spec location)

(Repeat for items 2-6.)

### Overall priorities
At the end, list the top 3 items you would prioritize fixing.

---

## Spec content

### Human-readable summary

{{summary_markdown}}

### YAML

\`\`\`yaml
{{yaml_content}}
\`\`\`
`,
    "seedPrompt.title": "AI Quick Draft",
    "seedPrompt.help": "Don't know where to start? Enter a title, then copy this prompt for an external AI (like Claude). It will help you generate a full JSON draft that you can import here.",
    "seedPrompt.button.idle": "Copy AI Seed Prompt",
    "seedPrompt.button.copied": "Copied ✓",
    "seedPrompt.button.failed": "Copy failed",
    "draftSwitcher.label": "Current draft",
    "draftSwitcher.untitled": "Untitled draft",
    "draftSwitcher.new": "+ New draft",
    "draftSwitcher.manage": "⚙ Manage",
    "draftSwitcher.empty": "+ Start your first draft",
    "draftManager.title": "Manage drafts",
    "draftManager.import": "Import JSON",
    "draftManager.importError": "Import failed: invalid JSON",
    "draftManager.export": "Export JSON",
    "draftManager.delete": "Delete",
    "draftManager.rename": "Rename",
    "draftManager.updatedAt": "Last updated",
    "draftManager.paste": "Paste JSON directly",
    "draftManager.pastePlaceholder": "Paste the AI-generated JSON object here...",
    "draftManager.pasteSubmit": "Confirm Import",
    "confirm.deleteDraft.title": "Delete draft?",
    "confirm.deleteDraft.message": "Delete this draft? This cannot be undone.",
    "confirm.confirm": "Confirm",
    "confirm.cancel": "Cancel",
    "empty.title": "Welcome",
    "empty.subtitle": "Start your first idea",
    "empty.cta": "+ New draft",
    "autosave.error": "Autosave failed. Please export JSON as backup.",
    "autosave.dismiss": "Dismiss"
  }
}
