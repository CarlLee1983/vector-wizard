# Handoff 操作指南

這份指南帶你完成 Stage 4：Handoff，把 Stage 3 切出來的每一個 `must` / `should` feature 各轉成一份 `*.feature-seed.json`，貼進 Vector wizard 的 Draft Manager。預期投入 30–60 分鐘 per feature——多數時間花在 Step 3 的欄位回填與 Step 4 的本地 lint，LLM 幫忙產出第一版骨架其實只佔幾分鐘。完成後你會得到 N 個獨立檔案，每一份都通過 schema 驗證且 wizard 接得起來。

## 你需要先準備什麼

- **`feature-candidates.json`**（來自 Stage 3 Slice）：含 priority、size、dependsOn 的 feature 清單。Handoff 的 priority 過濾閘只放行 `must` 與 `should` 兩桶，所以先把這份的內容掃一遍。
- **`system-brief.md` 內嵌的 `system-brief` JSON**（來自 Stage 1 Frame）：boundary 欄位（`constraints`、`riskiestAssumptions`、`openQuestions`）會原文傳遞到每個 feature 的 `agentBoundaries`，所以這份必須是 Stage 1 完成後鎖住的版本，不是中途隨手改過的草稿。
- 一個能跑 LLM 的環境——可以是手動貼進 ChatGPT、Claude、Gemini 任一介面，也可以是後續會做的 `vector-pipeline-b` skill。

## 步驟 1：選出要做的 feature

從 `feature-candidates.json` 取 `priority === "must"` 與 `priority === "should"` 的 feature，逐一處理。`could` 與 `wont` 不在這一輪做：`could` 留在 backlog 等下一輪回顧再升級，`wont` 已是顯式決定不做的紀錄。把選中的 feature id 列成一張清單，例如 `FT-001`、`FT-002`、`FT-003`，這就是本輪 Handoff 要產出的 seed 數量。

## 步驟 2：用 Seed Prompt 產生草稿

每個 feature 跑一次 seed prompt。Prompt 模板在 `src/features/spec-wizard/services/seedPromptBuilder.ts` 已經定義好，呼叫的方式是把 `feature.title`、可選的 owner 與 locale（`zh-TW` 或 `en`）帶進去，得到一段可貼進 LLM 的英文指示文字（指示文字本身是英文、要求 LLM 輸出的內容語言才隨 locale 變動）。

實務上有兩種跑法：

- **手動跑 ChatGPT**：把 `buildSeedPrompt({ title: feature.title, owner: "", locale: "zh-TW" })` 的輸出複製貼進 ChatGPT，得到一份 JSON draft，存成 `<feature-id>-<slug>.feature-seed.draft.json`。
- **交給 vector-pipeline-b skill**：呼叫 skill，由 skill 自己組 prompt、呼叫 LLM、回傳已 lint 過的 JSON。

兩種跑法產出的 draft 結構相同，差別只在誰跑 LLM。注意這時得到的還是 draft——欄位可能多、可能不對齊上游 brief，下一步要做欄位回填。

## 步驟 3：把上游欄位回填

LLM 產出的草稿不能直接出貨，因為它對你的 system-brief、feature-candidates 沒有完整視野，可能會自己編 risks 或 constraints。把下面這張對應表逐欄回填，覆蓋 LLM 自己發明的那一份：

| seed 欄位 | 來源 |
| --------- | ---- |
| `metadata.title` | `feature.title`（來自 `feature-candidates.json`） |
| `goal.statement` | `feature.oneLineGoal`（來自 `feature-candidates.json`） |
| `agentBoundaries.constraints` | `system-brief.constraints`（**原文照抄**，限制不分 feature） |
| `agentBoundaries.risks` | 從 `system-brief.riskiestAssumptions` 衍生；可改寫成 feature 特定形式，但必須能回溯到原本的假設。新增的純 feature 級風險請改放到 `openQuestions` 等人類確認 |
| `agentBoundaries.openQuestions` | `system-brief.openQuestions` + 此 feature 衍生的問題（限本 feature scope，需在 prose 段註明出處） |
| `goal.successSignals` | 取 `system-brief.successSignals` 中相關者；亦可加入由 `feature.oneLineGoal` 衍生的可量測 feature-specific 信號（避免 `better / faster / 更好 / 更快 / 提升`）；無相關者寫空陣列 |

`metadata.locale` 設成你寫 brief 時用的語系（`zh-TW` 或 `en`）。`metadata.owner` 暫時留空字串 `""`，等貼進 wizard 後人類補。`acceptanceCriteria` 與 `examples` 在 seed 階段一律是 `[]`。

## 步驟 4：本地 lint

回填完，跑一次本地 lint 確認 wizard 不會擋下匯入。三條 blocking 條件，缺一不可：

- `metadata.title` 不可空白。
- `goal.statement` 不可空白。
- 至少 1 個 story 帶 `title` 或 `userStory`（任一即可，兩個都有最好）。

另外做兩件清理：把 `acceptanceCriteria` 與 `examples` 清成 `[]`，把 `successSignals` 裡含 `better / faster / 更好 / 更快 / 提升` 等含糊形容詞的條目刪掉或重寫。Lint 過不了就回 Step 2 重跑，或回 Stage 3 補 candidate 的 `oneLineGoal`。

## 步驟 5：貼進 Vector wizard

打開 wizard：

```bash
npx vector-wizard
# 或本地開發：
bun run dev
```

進入 Draft Manager 分頁，找到「Paste JSON」按鈕，把 seed 檔內容整段貼上去。wizard 會跑 `validateDraft`：如果 `blockingErrors` 為空，draft 就成功匯入並可繼續往下走補 acceptanceCriteria 與 examples；如果有阻擋錯誤，回頭檢查 Step 4 的三條條件。

## 完成檢查表

- [ ] `feature-candidates.json` 中所有 `must` 與 `should` 的 feature 都有對應的 `*.feature-seed.json`。
- [ ] 每個 seed 通過 `feature-seed.schema.json` 結構驗證。
- [ ] 每個 seed 貼進 wizard 後 `blockingErrors === []`。
- [ ] 每個 seed 的 `risks` 都能回溯到 `system-brief.riskiestAssumptions`（即使做了 feature 級改寫）；`openQuestions` 包含 system-brief 的條目以及（若有）此 feature 衍生的問題；兩者都不是 LLM 憑空發明。
- [ ] 每個 seed 的 `acceptanceCriteria` 與 `examples` 都是 `[]`。
- [ ] 檔名形如 `<feature-id>-<short-slug>.feature-seed.json`（例：`FT-001-sso-signin.feature-seed.json`）。
