# AI Draft Review 設計

Date: 2026-04-26
Status: Approved for planning
Project: Vector
Related spec: `docs/superpowers/specs/2026-04-26-agile-roadmap-wizard-design.md`

## 1. Purpose

讓使用者在 Wizard 的 Review and Export 步驟一鍵取得「可貼給任意外部 AI agent（Claude Code、Codex、ChatGPT 等）的審閱 prompt」。AI agent 將檢視 spec 在語意層的品質（清晰度、可測性、一致性），給出文字回應。使用者讀完後手動回到 Wizard 修正欄位。

Wizard 本身**不串接 LLM、不管理 API key、不解析 AI 回應、不自動套用建議**。本功能只是把現有 draft 與一份高品質審閱指示打包成單一字串送進剪貼簿。

## 2. Scope

### In scope

- Review Summary tab 底部新增「AI 審閱協助」區塊：標題 + 一句說明 + 「複製 AI 審閱 prompt」按鈕。
- Prompt 結構固定：角色設定 + 任務指示 + 6 維度 checklist + 回應格式指示 + Spec 內容（人類摘要 + YAML）。
- Prompt 內文語言隨 `draft.metadata.locale`（zh-TW / en）。
- 區塊 UI 文案隨 `I18nContext` 當前 UI locale。
- 剪貼簿成功 / 失敗的視覺回饋；失敗時提供 textarea fallback。
- Vitest 涵蓋 prompt builder 與 ReviewPanel 互動。

### Out of scope（明確不做，避免 scope creep）

- LLM provider 串接、API key 管理。
- 解析 AI agent 回應、結構化匯入建議。
- 一鍵套用建議到欄位。
- 下載 prompt 為檔案。
- 使用者自訂審閱維度。
- 修改現有 `/api/assist` 行為（rewrite / quality_check 維持原狀）。
- 修改 YAML schema 或 `schemaVersion`。

## 3. User Flow

1. 使用者完成 Wizard 各步驟，到達 Review and Export。
2. 系統呼叫既有 `/api/generate-spec` 取得 `yaml`、`summary`、`validation`（既有流程不變）。
3. 使用者切到 **Review Summary tab**。
4. tab 最底部看到「AI 審閱協助」區塊：標題、一句說明、一顆按鈕。
5. 使用者按下「複製 AI 審閱 prompt」按鈕：
   - 成功：button label 變為「已複製 ✓」，2 秒後復原。
   - 失敗：button label 變為「複製失敗，請手動複製」，按鈕下方展開 readonly textarea 包含完整 prompt 供手動選取。
6. 使用者切到任意 AI agent session 貼上、取得回應、自行回 Wizard 編輯欄位、再次匯出。

## 4. Architecture

依現有 `src/features/spec-wizard/` 模組結構，新增 / 修改：

| 檔案                                    | 角色                                                                                                      | 異動       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| `services/reviewPromptBuilder.ts`       | 純函式 `buildReviewPrompt({ yaml, summary, locale }): string`。無副作用、無 async、無網路呼叫。           | 新增       |
| `i18n/dictionaries.ts`                  | 新增 prompt 範本字串、UI 文案 keys（zh-TW + en 各一份）                                                   | 修改       |
| `components/ReviewPanel.tsx`            | 在 Review Summary tab 加入「AI 審閱協助」區塊與按鈕；按下時呼叫 builder + `navigator.clipboard.writeText` | 修改       |
| `__tests__/reviewPromptBuilder.test.ts` | Builder 邏輯 + i18n 測試                                                                                  | 新增       |
| `__tests__/reviewPanel.test.tsx`        | 區塊渲染、按鈕互動、剪貼簿成功 / 失敗 UI                                                                  | 新增或補測 |

### 4.1 為什麼是純前端 builder（不開新 API route）

不開 `/api/review-prompt` route，理由：

- builder 只做字串組裝，不做 normalization / validation / LLM call，沒有放在 server 的必要。
- 所需資料（`yaml` 與 `summary`）已經在 client 端從 `/api/generate-spec` 回傳並存在 ReviewPanel state。
- 少一個 API route = 少一個合約、少一個 route test、少一次網路 round trip。
- 與 `services/yamlSerializer.ts` 同樣是純前端 service 的定位一致。

## 5. Prompt Template

### 5.1 結構

固定 5 區塊，順序：

1. **角色設定**：把 AI 定位為「資深產品/工程顧問，專長為 AI coding agent 撰寫的 spec 做品質審閱」。避免 AI 進入「直接寫實作」模式。
2. **任務指示**：明確要求「只給審閱回饋，不要重寫 spec、不要寫程式」；要求每條建議都標出 spec 中的位置（例如 `productSpec.goal.statement`、`epics[0].stories[0].acceptanceCriteria`）。
3. **審閱維度 checklist（6 項）**：見 5.2。
4. **回應格式指示**：要求 AI 按 6 個維度逐段回應，最後列 Top 3 優先修正項。
5. **Spec 內容**：先「人類摘要」（reuse `summary.ts` 輸出）、再「YAML 區塊」。

### 5.2 審閱維度（B2 通用品質維度）

1. **目標清晰度（Goal clarity）**：`goal.statement` 是否清楚描述「為誰、解決什麼問題、達到什麼狀態」？`successSignals` 是否實際可量測？
2. **使用者故事完整性（Story completeness）**：每個 story 的 `userStory` 是否包含角色、想做什麼、為什麼？標題與內文是否一致？
3. **驗收條件可測性（Acceptance criteria testability）**：每條 AC 是否可直接轉成自動化測試？是否避免主觀字眼（「好用」、「合理」、「順暢」）？
4. **範例邊界涵蓋（Example coverage）**：examples 是否涵蓋 happy path、邊界情況、錯誤情境？given/when/then 是否完整？
5. **Agent 邊界充分性（Agent boundary sufficiency）**：`agentSpec` 中的 `nonGoals`、`constraints`、`risks` 是否足以避免 AI coding agent 過度實作、超出範圍、或產生不安全行為？
6. **區段間一致性（Cross-section consistency）**：`goal` 與 `stories` 是否對齊？`impacts` 中提到的 actor 是否在 `stories` 或 `userActivities` 中也有出現？`constraints` 是否與任何 story 互相抵觸？

### 5.3 zh-TW 範本（完整）

````
# 規格審閱請求

你是一位資深產品/工程顧問，專長是為 AI coding agent 撰寫的功能規格做品質審閱。

## 任務

請針對下方功能規格給出改良建議。請**只給審閱回饋**，不要直接撰寫程式碼或重新撰寫規格。所有建議都要對應到下方 checklist 中的某個維度，並指出 spec 中具體位置（例如 `productSpec.goal.statement`、`epics[0].stories[0].acceptanceCriteria`）以利原作者回到編輯器修正對應欄位。

## 審閱維度（請對每一項給出「評估」與「具體建議」）

1. **目標清晰度（Goal clarity）**：`goal.statement` 是否清楚描述「為誰、解決什麼問題、達到什麼狀態」？`successSignals` 是否實際可量測？
2. **使用者故事完整性（Story completeness）**：每個 story 的 `userStory` 是否包含角色、想做什麼、為什麼？標題與內文是否一致？
3. **驗收條件可測性（Acceptance criteria testability）**：每條 AC 是否可直接轉成自動化測試？是否避免主觀字眼（「好用」、「合理」、「順暢」）？
4. **範例邊界涵蓋（Example coverage）**：examples 是否涵蓋 happy path、邊界情況、錯誤情境？given/when/then 是否完整？
5. **Agent 邊界充分性（Agent boundary sufficiency）**：`agentSpec` 中的 `nonGoals`、`constraints`、`risks` 是否足以避免 AI coding agent 過度實作、超出範圍、或產生不安全行為？
6. **區段間一致性（Cross-section consistency）**：`goal` 與 `stories` 是否對齊？`impacts` 中提到的 actor 是否在 `stories` 或 `userActivities` 中也有出現？`constraints` 是否與任何 story 互相抵觸？

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

```yaml
{{yaml_content}}
````

```

### 5.4 en 範本

en 版完全鏡像 5.3 結構與 6 個維度，僅語言不同。實作時放入 `dictionaries.en.reviewPrompt.template`，與 zh-TW 一一對應。

### 5.5 動態變數與組裝

`buildReviewPrompt({ yaml, summary, locale })` 內部：

1. 從 `dictionaries[locale]` 取出 `reviewPrompt.template`（含 `{{summary_markdown}}` 與 `{{yaml_content}}` 兩個 placeholder 的字串）。
2. 直接字串替換（不引入 templating library）。
3. 回傳組裝後字串。

不對 `summary` 或 `yaml` 做 escape：它們將被放進 markdown 與 fenced code block，AI agent 預期看到的就是原始內容。

### 5.6 為什麼 summary + YAML 兩者都放

- **YAML** 給 AI 看到結構與 schema，建議才能精準對應 spec 欄位路徑。
- **summary** 給 AI 看到「人類視角」，比 YAML 更易讀，AI 對語意品質判斷更準。
- 兩者一致時 AI 信心高；不一致時 AI 會主動指出（這也是審閱價值之一）。

## 6. UI Specification

### 6.1 區塊樣式

```

─── AI 審閱協助 ─────────────────────────────────
複製後可貼到 Claude Code、ChatGPT 等 AI agent，
請其針對本 spec 提出改良建議。AI 不會直接修改本草稿。

[ 複製 AI 審閱 prompt ]
─────────────────────────────────────────────

```

- 位置：Review Summary tab 最底部，與摘要內容之間用分隔線或間距區隔。
- 標題：對應 design pattern 中的 section heading 等級。
- 描述文字：1 句，明確點出「貼給外部 AI agent」與「AI 不會修改 draft」。
- 按鈕：單一，無 dropdown / split button。

### 6.2 按鈕狀態機

| 狀態 | 觸發 | label | 持續時間 |
|---|---|---|---|
| `idle` | 初始 / 復原 | `複製 AI 審閱 prompt` | — |
| `copied` | clipboard 成功 | `已複製 ✓` | 2 秒後回到 `idle` |
| `failed` | clipboard 拋錯 | `複製失敗，請手動複製` | 直到使用者再點 |

### 6.3 剪貼簿失敗 fallback

當 `navigator.clipboard.writeText` reject（舊瀏覽器、insecure context、permission 拒絕），按鈕下方展開一個 `<textarea readonly>` 包含完整 prompt，使用者可手動全選複製。textarea 預設折疊（不渲染 / `hidden`），失敗時才出現。

## 7. i18n

### 7.1 雙軌 locale

| 內容類別 | locale 來源 |
|---|---|
| UI 元素（區塊標題、按鈕 label、描述、fallback 訊息）| `I18nContext` 當前 UI locale，透過既有 `useTranslation()` |
| Prompt 內文（範本、6 維度標籤、回應格式指示）| `draft.metadata.locale` |

### 7.2 新增 dictionary keys

zh-TW 與 en 各補一份：

```

reviewPrompt.section.title // UI: 區塊標題
reviewPrompt.section.description // UI: 一句說明
reviewPrompt.button.idle // UI: 預設 button label
reviewPrompt.button.copied // UI: 複製成功後 label
reviewPrompt.button.failed // UI: 複製失敗 label
reviewPrompt.fallback.label // UI: textarea 上方說明
reviewPrompt.template // Prompt: 完整範本

```

`MessageKey` union 補上這 7 個 key；缺譯就是 TypeScript error，符合既有 i18n 守則。

## 8. Edge Cases

| 情境 | 處理 |
|---|---|
| 有 blocking errors | 按鈕**仍啟用**。spec 不完整時 AI 審閱反而最有價值，AI 可以建議「缺什麼」。也與「Validation 是 loose、不應阻擋使用者」的設計原則一致。 |
| YAML 產生失敗（`/api/generate-spec` 失敗）| 整個區塊**不渲染**（沒有 YAML 可放進 prompt）。Review Summary tab 既有錯誤處理覆蓋此情況。 |
| Draft 幾乎為空 | 按鈕仍啟用。Prompt 反映 spec 是空的，AI 自然會回「請先補上 X / Y / Z」。不做特別偵測。 |
| Clipboard API 不可用 | 失敗 fallback：textarea + 手動選取（見 6.3）。 |
| 非常長的 YAML | 不截斷，全文進剪貼簿。現代瀏覽器無實務問題。 |

## 9. Testing Strategy

### 9.1 `__tests__/reviewPromptBuilder.test.ts`（新增）

- zh-TW prompt 結構正確：含 6 個中文維度標題、含 `## Spec 內容`、含 YAML fenced block。
- en prompt 結構正確：6 個英文維度標題對應。
- `{{summary_markdown}}` 與 `{{yaml_content}}` 兩個 placeholder 都被替換、且不留殘餘 `{{...}}`。
- 空 summary / 空 yaml 不破壞結構（區塊仍存在，只是內容為空）。
- 輸入 fixture 用 `minimalValidDraft()` 衍生。

### 9.2 `__tests__/reviewPanel.test.tsx`（既有檔，補測試）

- 「AI 審閱協助」區塊渲染：標題、描述、按鈕都存在。
- 按鈕點擊呼叫 `navigator.clipboard.writeText`，且傳入內容等於 `buildReviewPrompt(...)` 輸出。
- 成功路徑：點擊後 label 變 `已複製 ✓`，2 秒後回到 idle（`vi.useFakeTimers`）。
- 失敗路徑：mock `navigator.clipboard.writeText` reject → label 變 `複製失敗`，fallback textarea 出現且內容 = prompt。
- 當 YAML 為空（生成失敗 state）時，整個區塊不渲染。
- UI locale 切換時區塊標題、按鈕 label 換語言；draft locale 切換時 prompt 內容換語言（後者透過直接呼叫 builder 驗證）。

## 10. MVP Completion Criteria

- 使用者在 Review Summary tab 看到「AI 審閱協助」區塊，含標題、描述、按鈕。
- 點按鈕後完整 prompt 進入剪貼簿；prompt 內容包含 5 個固定區塊與 6 個審閱維度。
- Prompt 內文語言隨 `draft.metadata.locale` 切換。
- 區塊 UI 文案隨 `I18nContext` UI locale 切換。
- 剪貼簿成功有「已複製 ✓」回饋；失敗有 fallback textarea。
- Vitest 涵蓋 builder（zh-TW + en）與 ReviewPanel 互動（成功 / 失敗 / 空 YAML / locale 切換）。
- 既有 `/api/assist` 與 `/api/generate-spec` 行為完全不變。
```
