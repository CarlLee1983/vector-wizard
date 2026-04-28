import type { Locale } from "../model/specTypes"
import type { MessageKey } from "./messageKeys"

export type { MessageKey }

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
    "review.investHeading": "故事就緒檢查（INVEST）",
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
    "field.titleHelp": "請填「這次要交付的功能或改善」，不是專案名稱；例如：客戶退貨流程自動化優化。",
    "field.titlePlaceholder": "例：客戶退貨流程自動化優化",
    "field.owner": "負責人",
    "field.ownerHelp": "填主要決策或驗收窗口，方便後續確認需求；可以是姓名、角色或團隊。",
    "field.ownerPlaceholder": "例：PM Team、產品負責人 Annie",
    "field.problem": "問題背景",
    "field.problemHelp": "描述現在卡在哪裡、誰受影響、為什麼值得處理。",
    "field.problemPlaceholder": "例：我們目前無法快速追蹤 CNC 刀具的磨損情況，這導致了預算超支與生產停工。",
    "field.desiredOutcome": "期望成果",
    "field.desiredOutcomeHelp": "描述完成後希望使用者或業務狀態變成什麼樣子。",
    "field.desiredOutcomePlaceholder": "例：簡化並自動化核心路徑，讓使用者能在 2 分鐘內達成目標，提升產品價值感。",
    "field.goal": "目標",
    "field.goalHelp": "用一句可驗收的目標說明本次交付要達成什麼。",
    "field.goalPlaceholder": "例：將作業完成時間縮短 80%，並降低操作過程中的人為錯誤率。",
    "field.successSignals": "成功訊號",
    "field.successSignalsHelp": "列出可觀察的成功跡象；可以是數據、行為或驗收判斷。",
    "field.successSignalsPlaceholder": "例：平均作業耗時下降、使用者滿意度評分提升、相關客服支援請求減少",
    "field.storyTitle": "使用者故事標題（一句話描述情境）",
    "field.storyTitleHelp": "請填這則故事要解決的使用者情境；例如：自動產生退貨標籤。",
    "field.storyTitlePlaceholder": "例：自動產生退貨標籤",
    "field.userStory": "使用者故事",
    "field.userStoryHelp": "用「作為⋯我想要⋯以便⋯」描述角色、需求與價值。",
    "field.userStoryPlaceholder": "例：作為客戶，我希望能一鍵產生退貨標籤，以便我能快速完成寄送。",
    "field.epicTitle": "Epic 標題",
    "field.epicTitleHelp": "把相關故事群組成一個能力或流程階段；例如：退貨物流整合。",
    "field.epicTitlePlaceholder": "例：退貨物流整合",
    "field.impactActor": "受影響角色",
    "field.impactActorHelp": "誰的工作或決策會被這次功能改善。",
    "field.impactActorPlaceholder": "例：客服人員",
    "field.impact": "影響",
    "field.impactHelp": "描述此角色會得到的具體改善。",
    "field.impactPlaceholder": "例：大幅減少手動核對訂單與產生標籤的時間",
    "field.userActivityActor": "使用者活動角色",
    "field.userActivityActorHelp": "執行此活動的主要角色。",
    "field.userActivityActorPlaceholder": "例：終端客戶",
    "field.userActivity": "使用者活動",
    "field.userActivityHelp": "描述使用者在系統中要完成的流程或任務。",
    "field.userActivityPlaceholder": "例：申請退貨、選擇原因、產出退貨標籤",
    "field.deliverableName": "交付項目名稱",
    "field.deliverableNameHelp": "這次要交付給使用者或工程實作的主要能力。",
    "field.deliverableNamePlaceholder": "例：自動化退貨申請系統",
    "field.deliverableDescription": "交付項目描述",
    "field.deliverableDescriptionHelp": "補充此交付項目包含哪些可驗收內容。",
    "field.deliverableDescriptionPlaceholder": "例：包含退貨原因檢核、物流 API 對接與電子標籤生成",
    "field.acceptanceCriteria": "驗收條件",
    "field.acceptanceCriteriaHelp": "列出工程完成後必須符合的可驗收規則。",
    "field.acceptanceCriteriaPlaceholder": "例：系統必須在 3 秒內回傳有效的物流追蹤碼",
    "field.exampleScenario": "範例情境",
    "field.exampleScenarioHelp": "用一個具體情境說明輸入、行為與預期結果。",
    "field.exampleScenarioPlaceholder": "例：當客戶點擊「產出標籤」後，系統應立即產生 PDF 格式的物流單據。",
    "field.given": "假設 (Given)",
    "field.givenHelp": "描述測試開始前的系統狀態或前提條件。",
    "field.givenPlaceholder": "例：訂單狀態為「已送達」且在 7 天鑑賞期內",
    "field.when": "當...時 (When)",
    "field.whenHelp": "觸發此情境的關鍵動作或事件。",
    "field.whenPlaceholder": "例：客戶提交退貨申請並選擇「尺寸不合」",
    "field.then": "接著 (Then)",
    "field.thenHelp": "預期發生的結果過狀態變遷。",
    "field.thenPlaceholder": "例：系統產生一組退貨代碼，並將訂單狀態更新為「退貨申請中」",
    "field.testExpectations": "測試期望",
    "field.testExpectationsHelp": "列出 AI coding agent 應補上的測試或驗證方式。",
    "field.testExpectationsPlaceholder": "例：驗證過期訂單是否無法產生退貨標籤",
    "field.constraints": "限制",
    "field.constraintsHelp": "列出工程或產品上不能違反的規則，避免實作走錯方向。",
    "field.constraintsPlaceholder": "例：必須符合物流商 API 規範、不可變動現有訂單資料庫結構",
    "field.nonGoals": "非目標",
    "field.nonGoalsHelp": "明確寫出這次不做什麼，避免需求範圍擴大。",
    "field.nonGoalsPlaceholder": "例：不包含跨國退貨支援、不更換物流供應商",
    "field.risks": "風險",
    "field.risksHelp": "列出可能的技術挑戰或業務風險。",
    "field.risksPlaceholder": "例：第三方物流系統的穩定性可能影響標籤產出速度。",
    "field.openQuestions": "待釐清問題 (Open Questions)",
    "field.openQuestionsHelp": "列出目前尚無定論、需要進一步確認的問題。",
    "field.openQuestionsPlaceholder": "例：是否需要支援超商多媒體機台 (如 ibon) 列印？",
    "validation.missingTitle": "請填寫功能名稱。",
    "validation.missingGoal": "請填寫目標。",
    "validation.missingStory": "請至少填寫一個使用者故事。",
    "validation.storyMissingAcceptanceCriteria": "故事缺少驗收條件。",
    "validation.storyMissingExamples": "故事缺少範例。",
    "validation.storyOrphanExamples": "故事有具體例子但沒有驗收條件，請補上對應的驗收條件。",
    "validation.draftAcceptanceCriteriaWithoutExamples":
      "整份草稿已有驗收條件但沒有任何具體例子；建議每條 AC 都搭配一個範例情境。",
    "validation.storyAcceptanceCriteriaNotGwt": "故事的驗收條件可改寫為 Given / When / Then 三段格式，讓行為更明確。",
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
    "validation.openQuestionsPresent": "在「限制與風險」分頁中仍有未解決的問題，請務必釐清。",
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
    "handoff.button.idle": "送交 Agent 實作",
    "handoff.button.pending": "傳送中...",
    "handoff.button.success": "已送達專案目錄 ✓",
    "handoff.button.failed": "傳送失敗",
    "agentDraft.button.idle": "呼叫 Agent 寫草稿",
    "agentDraft.button.pending": "Agent 正在思考中...",
    "agentDraft.button.success": "草稿已就緒 ✓",
    "agentDraft.load": "載入 Agent 草稿",
    "seedPrompt.title": "AI 快速生成草稿",
    "seedPrompt.help":
      "不知道怎麼開始？輸入功能標題後，複製下方 Prompt 給外部 AI (如 Claude)，它會幫你生成一份完整的 JSON 草稿，匯入後即可開始編輯。",
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
    "autosave.dismiss": "知道了",
    "field.featureId": "Feature ID（選填，與 Pipeline B 對應）",
    "field.featureIdHelp":
      "若這份 draft 是從 Pipeline B 的 feature-candidates 帶過來，填同一個 FT-XXX 編號可保留追溯。",
    "field.featureIdPlaceholder": "例：FT-001",
    "field.horizon": "Roadmap 階段（選填）",
    "field.horizonHelp": "三層粗略時序：現在做 / 下一輪做 / 之後再考慮。",
    "field.priority": "MoSCoW 優先級（選填）",
    "field.priorityHelp": "Must（必要）、Should（應該）、Could（可以）、Won’t（這次不做）。",
    "field.dependsOn": "依賴的 Feature ID（選填）",
    "field.dependsOnHelp": "用逗號分隔，列出本 feature 需要先完成的其他 feature ID。",
    "field.dependsOnPlaceholder": "例：FT-002, FT-005",
    "step.roadmap": "Roadmap",
    "review.roadmap": "Roadmap 位置",
    "horizon.now": "Now（現在做）",
    "horizon.next": "Next（下一輪）",
    "horizon.later": "Later（之後考慮）",
    "horizon.unset": "未設定",
    "priority.must": "Must",
    "priority.should": "Should",
    "priority.could": "Could",
    "priority.wont": "Won’t",
    "priority.unset": "未設定"
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
    "review.investHeading": "Story Readiness (INVEST)",
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
      "Enter the feature or improvement being delivered, not the project name; e.g. Customer return process automation.",
    "field.titlePlaceholder": "e.g. Customer return process automation",
    "field.owner": "Owner",
    "field.ownerHelp": "Enter the main decision maker or acceptance contact; a name, role, or team is fine.",
    "field.ownerPlaceholder": "e.g. PM Team, Product Owner Annie",
    "field.problem": "Problem background",
    "field.problemHelp": "Describe what is not working today, who is affected, and why it is worth fixing.",
    "field.problemPlaceholder":
      "e.g. We currently cannot quickly track CNC tool wear, which leads to budget overruns and production downtime.",
    "field.desiredOutcome": "Desired outcome",
    "field.desiredOutcomeHelp": "Describe what should be better for users or the business after this ships.",
    "field.desiredOutcomePlaceholder":
      "e.g. Simplify and automate the core path so users can achieve their goal within 2 minutes.",
    "field.goal": "Goal",
    "field.goalHelp": "Write one testable sentence for what this delivery should achieve.",
    "field.goalPlaceholder": "e.g. Reduce task completion time by 80% and minimize human errors during the process.",
    "field.successSignals": "Success signals",
    "field.successSignalsHelp": "List observable signs of success; metrics, behaviors, or review checks are all OK.",
    "field.successSignalsPlaceholder":
      "e.g. Decrease in average task time, higher satisfaction scores, fewer support requests.",
    "field.storyTitle": "User story title (one sentence about the scenario)",
    "field.storyTitleHelp": "Enter the user scenario this story solves; e.g. Automatically generate return label.",
    "field.storyTitlePlaceholder": "e.g. Automatically generate return label",
    "field.userStory": "User story",
    "field.userStoryHelp": "Use “As a..., I want..., so that...” to describe role, need, and value.",
    "field.userStoryPlaceholder":
      "e.g. As a customer, I want to generate a return label with one click so I can ship it back quickly.",
    "field.epicTitle": "Epic title",
    "field.epicTitleHelp":
      "Group related stories into one capability or workflow stage; e.g. Return logistics integration.",
    "field.epicTitlePlaceholder": "e.g. Return logistics integration",
    "field.impactActor": "Impacted actor",
    "field.impactActorHelp": "Who will have their work or decisions improved by this feature.",
    "field.impactActorPlaceholder": "e.g. Support agent",
    "field.impact": "Impact",
    "field.impactHelp": "Describe the concrete improvement this actor receives.",
    "field.impactPlaceholder": "e.g. Dramatically reduced time spent manually verifying orders and generating labels",
    "field.userActivityActor": "User activity actor",
    "field.userActivityActorHelp": "The main role performing this activity.",
    "field.userActivityActorPlaceholder": "e.g. End customer",
    "field.userActivity": "User activity",
    "field.userActivityHelp": "Describe the workflow or task the user needs to complete.",
    "field.userActivityPlaceholder": "e.g. Request return, select reason, generate return label",
    "field.deliverableName": "Deliverable name",
    "field.deliverableNameHelp": "The main capability being delivered to users or engineering.",
    "field.deliverableNamePlaceholder": "e.g. Automated return request system",
    "field.deliverableDescription": "Deliverable description",
    "field.deliverableDescriptionHelp": "Clarify what acceptance-ready content this deliverable includes.",
    "field.deliverableDescriptionPlaceholder":
      "e.g. Includes return reason validation, logistics API integration, and e-label generation",
    "field.acceptanceCriteria": "Acceptance criteria",
    "field.acceptanceCriteriaHelp": "List testable rules that must be true when engineering is done.",
    "field.acceptanceCriteriaPlaceholder": "e.g. System must return a valid tracking code within 3 seconds",
    "field.exampleScenario": "Example scenario",
    "field.exampleScenarioHelp": "Describe one concrete input, behavior, and expected result.",
    "field.exampleScenarioPlaceholder":
      "e.g. When a customer clicks 'Generate Label', the system immediately produces a PDF shipping document.",
    "field.given": "Given",
    "field.givenHelp": "Describe the initial state or preconditions before the action.",
    "field.givenPlaceholder": "e.g. Order status is 'Delivered' and within the 7-day return window",
    "field.when": "When",
    "field.whenHelp": "The key action or event that triggers the scenario.",
    "field.whenPlaceholder": "e.g. Customer submits a return request with reason 'Wrong size'",
    "field.then": "Then",
    "field.thenHelp": "The expected outcome or state change.",
    "field.thenPlaceholder": "e.g. System generates a return code and updates order status to 'Return Requested'",
    "field.testExpectations": "Test expectations",
    "field.testExpectationsHelp": "List tests or checks the AI coding agent should add.",
    "field.testExpectationsPlaceholder": "e.g. Verify that expired orders cannot generate return labels",
    "field.constraints": "Constraints",
    "field.constraintsHelp": "List product or engineering rules the implementation must not violate.",
    "field.constraintsPlaceholder": "e.g. Must comply with logistics API specs; do not change core order state logic",
    "field.nonGoals": "Non-goals",
    "field.nonGoalsHelp": "Write what is intentionally out of scope so the request does not expand.",
    "field.nonGoalsPlaceholder": "e.g. Does not include international returns; does not switch logistics providers",
    "field.risks": "Risks",
    "field.risksHelp": "List potential technical challenges or business risks.",
    "field.risksPlaceholder": "e.g. Third-party logistics API stability might affect label generation speed.",
    "field.openQuestions": "Open Questions",
    "field.openQuestionsHelp": "List questions that are still undecided or need further clarification.",
    "field.openQuestionsPlaceholder": "e.g. Should we support in-store kiosk printing as a fallback?",
    "validation.missingTitle": "Enter a feature title.",
    "validation.missingGoal": "Enter a goal.",
    "validation.missingStory": "Enter at least one user story.",
    "validation.storyMissingAcceptanceCriteria": "Story is missing acceptance criteria.",
    "validation.storyMissingExamples": "Story is missing examples.",
    "validation.storyOrphanExamples": "Story has examples but no acceptance criteria — add the criteria they map to.",
    "validation.draftAcceptanceCriteriaWithoutExamples":
      "Draft has acceptance criteria but no examples; pair each AC with a concrete scenario.",
    "validation.storyAcceptanceCriteriaNotGwt":
      "Acceptance criteria can be rewritten in Given / When / Then form for clarity.",
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
    "validation.openQuestionsPresent": "There are unresolved open questions in the 'Boundaries' tab.",
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
    "handoff.button.idle": "Handoff to Agent",
    "handoff.button.pending": "Sending...",
    "handoff.button.success": "Delivered to project ✓",
    "handoff.button.failed": "Handoff failed",
    "agentDraft.button.idle": "Ask Agent for Draft",
    "agentDraft.button.pending": "Agent is thinking...",
    "agentDraft.button.success": "Draft Ready ✓",
    "agentDraft.load": "Load Agent Draft",
    "seedPrompt.title": "AI Quick Draft",
    "seedPrompt.help":
      "Don't know where to start? Enter a title, then copy this prompt for an external AI (like Claude). It will help you generate a full JSON draft that you can import here.",
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
    "autosave.dismiss": "Dismiss",
    "field.featureId": "Feature ID (optional, links to Pipeline B)",
    "field.featureIdHelp":
      "If this draft was seeded from Pipeline B feature-candidates, use the same FT-XXX id to keep traceability.",
    "field.featureIdPlaceholder": "e.g. FT-001",
    "field.horizon": "Roadmap horizon (optional)",
    "field.horizonHelp": "Coarse-grained schedule: do now / do next / consider later.",
    "field.priority": "MoSCoW priority (optional)",
    "field.priorityHelp": "Must, Should, Could, or Won’t (not this round).",
    "field.dependsOn": "Depends on (optional)",
    "field.dependsOnHelp": "Comma-separated list of other feature ids this one needs first.",
    "field.dependsOnPlaceholder": "e.g. FT-002, FT-005",
    "step.roadmap": "Roadmap",
    "review.roadmap": "Roadmap position",
    "horizon.now": "Now",
    "horizon.next": "Next",
    "horizon.later": "Later",
    "horizon.unset": "Not set",
    "priority.must": "Must",
    "priority.should": "Should",
    "priority.could": "Could",
    "priority.wont": "Won’t",
    "priority.unset": "Not set"
  }
}
