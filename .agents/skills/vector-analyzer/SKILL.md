---
name: vector-analyzer
description: Analyze source code and generate Vector-compatible JSON feature specifications.
---

# Vector Analyzer Skill

這個技能允許 AI Agent 分析現有的程式碼庫，並自動產出符合「Vector」架構的規格書 JSON。這有助於將現有的實作邏輯轉化為結構化的敏捷開發路線圖。

## 指令

### `vector:analyze`
分析當前目錄下的程式碼，並產出功能規格 JSON。

**使用流程：**
1. AI 掃描目標目錄以識別核心模組。
2. AI 將模組映射為「Epics」與「User Stories」。
3. AI 產出符合 Vector Schema 的 JSON 草稿。
4. 使用者將 JSON 貼上至 Vector Wizard 介面進行審閱與匯出。

## 工作流 (Workflow)

1. **探索階段 (Discovery)**：
   - 使用 `ls` 或 `gsd-map-codebase` 理解檔案結構。
   - 讀取核心檔案（如：Service, Controller, API 定義）。

2. **分析階段 (Analysis)**：
   - 針對每個功能模組，識別以下資訊：
     - **目標 (Goal)**：這段程式碼解決了什麼問題？
     - **影響 (Impact)**：誰是使用者？他們如何從中受益？
     - **使用者故事 (User Stories)**：將實作邏輯轉化為「作為 [角色]，我想要 [操作]，以便 [效益]」。
     - **驗證準則 (Acceptance Criteria)**：從程式碼邏輯中提取規則。
     - **範例 (Examples)**：將測試案例或邏輯流程轉化為 Given/When/Then 情境。

3. **產出階段 (Generation)**：
   - 產出符合 `FeatureDraft` Schema 的 JSON 物件。
   - 語系：預設為繁體中文（台灣）。

## Schema 參考

生成的 JSON 必須包含：
- `metadata`: 標題、作者、語系。
- `summary`: 問題描述、預期結果。
- `goal`: 目標聲明、成功指標。
- `impacts`: 受影響的角色與程度。
- `deliverables`: 交付物清單。
- `userActivities`: 使用者活動流程。
- `epics`: 功能集，包含多個 User Stories (AC & Examples)。
- `agentBoundaries`: 非目標、限制條件、風險、開放問題。
