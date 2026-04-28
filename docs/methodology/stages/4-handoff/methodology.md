# Stage 4：Handoff（產出 feature-seed）

Slice 完成後我們手上有一份 `feature-candidates.json`，裡頭一片片 feature 各自帶著 priority、size、dependsOn。但 candidate 還停在「我們打算切成這幾片」這個層級——欄位很少、敘述很短，AI Coding Agent 還無法直接拿著它去寫程式碼。Handoff 階段把 Stage 1–3 的結構壓成 N 個 `feature-seed.json`，每一份都對應一個 `must` / `should` 的 candidate，貼進 Vector wizard 的 Draft Manager 後就能由人類接手在 wizard UI 內補上 acceptanceCriteria 與 examples，最終匯出成 AI agent 能讀的 YAML feature spec。

## 為何不一次填滿 FeatureDraft

Vector 的核心不變式是「AI 非權威」（見 `AGENTS.md` 中的 invariants 列表）：assistService 與任何上游自動化都只能產生建議、警告、假設、待釐清問題，永遠不能直接替使用者寫死 acceptanceCriteria、examples、risks 這類「需要人類拍板」的欄位。Handoff 在這條線上恰好踩在「自動可填」與「必須人類拍板」之間：Stage 1–3 的結構性成果（goal、impacts 草稿、story 骨架）我們可以放心壓進 seed；具體驗收條件、Given/When/Then 例子、risks 的最終敲定，留在 wizard 內由人類補。

換句話說，Handoff 只填這幾類欄位：`metadata`、`summary` 草稿、`goal.statement` 與 `goal.successSignals`、`impacts` 草稿、`deliverables` 草稿、`userActivities` 草稿、`epics` 內 story 的 `title` 與 `userStory` 骨架，以及從 system-brief 直接傳遞下來的 `agentBoundaries`。`acceptanceCriteria` 與 `examples` 在 seed 裡保持空陣列；任何 AI 推測出來、卻沒有上游證據支撐的內容，一律寫進 `agentBoundaries.openQuestions`。

## 4 個小步驟

我們把 Handoff 拆成四個小步驟：Seed Prompt（reuse 模式）→ LLM Conversion → Lint → Export。順序代表上一步是下一步的輸入，不可隨意跳過。

- **Sub 4.1 Seed Prompt（reuse 模式）**：對每個 priority 為 `must` 或 `should` 的 feature，重用 wizard 內既有的 seed prompt builder（見 `src/features/spec-wizard/services/seedPromptBuilder.ts`）。把 `feature.title`、`feature.oneLineGoal`、可選的 owner 與 locale 帶進 prompt 模板，得到一段可直接貼進 LLM 的指示文字。Reuse 的目的是讓 Handoff 與 wizard 內「在 Wizard 裡按 Generate Seed」走同一套提示詞，避免兩處模板分歧。
- **Sub 4.2 LLM Conversion**：把 prompt 交給 LLM（手動跑 ChatGPT、或交給 vector-pipeline-b skill），輸出一份接近完整的 `FeatureDraft` JSON。注意這裡產出的 draft 可能會「順手」把 acceptanceCriteria 與 examples 也填了——下一步的 Lint 會把它們清掉，避免 AI 越界做出未經人類確認的承諾。
- **Sub 4.3 Lint**：套用一組「等價於 wizard `validateDraft.ts` 的規則」做本地檢查：`metadata.title` 不可空、`goal.statement` 不可空、至少 1 個 story 帶 `title` 或 `userStory`；同時把 LLM 額外產出的 `acceptanceCriteria` 與 `examples` 清空。Lint 失敗時不可繼續匯出——要嘛回 4.1 重跑、要嘛回 Stage 3 補 candidate 欄位。
- **Sub 4.4 Export**：每一個 `must` / `should` feature 各匯出一檔，命名為 `<feature-id>-<short-slug>.feature-seed.json`（例：`FT-001-sso-signin.feature-seed.json`）。一份 candidate ↔ 一份 seed 檔，不合併、不拆分。

## 與 Vector wizard 的銜接

`feature-seed.schemaVersion` 永遠追蹤 wizard 端的 `schemaVersion`，目前固定為 `"0.1"`。當 wizard 端的 YAML schema bump 時（例：增加新的 metadata 欄位、調整 epic 結構），`feature-seed.schema.json` 必須一同 bump 並對應修正 lint 規則；schema 升版必須是顯式行為，不是 silent migration。

實務操作：把 seed 檔貼進 wizard 的方式有兩種——一是 Draft Manager UI 的「Paste JSON」按鈕，二是「Import JSON file」按鈕。兩種都會走 wizard 內既有的 import 流程（`src/features/spec-wizard/persistence/draftStorage.ts`），所以 schema 對齊的要求是雙向的：seed 要能被 wizard 讀進來而不報錯，wizard 也必須維持向下相容直到下次 schema bump。

## 不會做的事

Handoff 不替使用者跨越「結構壓平」與「需求拍板」之間的那條線。具體：

- **不自動填 acceptanceCriteria**：每個 story 的 `acceptanceCriteria` 在 seed 裡保持 `[]`，人類在 wizard 裡用 INVEST 視角自己補。
- **不自動填 examples**：Given/When/Then 三段式範例同樣保持 `[]`，因為它們牽涉到具體系統行為的承諾。
- **不替使用者確認 risks**：從 system-brief 的 `riskiestAssumptions` 傳遞下來的 risks，原文照抄；不擴寫、不刪減、不評估「這條 risk 還在不在」——這個判斷留在使用者跑下一輪回顧時做。

## 進入完成的條件

Handoff 階段算完成的條件：

- 對 Stage 3 `feature-candidates.json` 中所有 `priority === "must"` 與 `priority === "should"` 的 feature，各產出一份 `*.feature-seed.json`。
- 每一份 seed 都通過 `feature-seed.schema.json` 結構驗證，且通過 wizard `validateDraft` 不阻擋（`blockingErrors === []`）。
- 每一份 seed 的 `risks` 與 `openQuestions` 都來自 system-brief（或 wizard 內的人類補充），不是 LLM 自己發明的。
- `acceptanceCriteria` 與 `examples` 在 seed 裡保持 `[]`。
