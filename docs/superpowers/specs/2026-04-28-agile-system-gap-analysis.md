# Agile 系統視角的 Gap 分析

- **日期**：2026-04-28
- **分析對象**：`vector-agile-roadmap-wizard`（Wizard 端） + `docs/methodology/`（Pipeline B 手冊端）
- **目的**：以敏捷開發系統的角度，盤點本專案目前可改善加強之處，作為後續迭代規劃的依據。
- **依據文件**：
  - `AGENTS.md`
  - `DESIGN.md`
  - `docs/superpowers/specs/2026-04-26-agile-roadmap-wizard-design.md`
  - `docs/superpowers/specs/2026-04-28-methodology-pipeline-design.md`
  - `docs/methodology/README.md`、`docs/methodology/pipeline-b.md`
  - `docs/methodology/schemas/{system-brief,capability-list,feature-candidates,feature-seed}.schema.json`
  - `src/features/spec-wizard/model/`、`services/`、`__tests__/`

---

## 0. 快速結論

立意清楚，不貪多——「非技術 PO → AI coding agent」的單向橋樑，AI 非權威、單人本地工具、YAML 為交付介面，這三條在程式碼與測試都守得很乾淨。但站在敏捷開發系統的角度，目前主要是「**單一 feature spec 工具**」而非真正的「**roadmap 工具**」，且驗證、回饋、銜接環節有可預期的弱點。以下為八項可改善點，依「對 agile 流程價值 / 改動成本」排序。

---

## 1. 「Roadmap」這個字已兌現 ✅ 已實作 (2026-04-28)

### 實作說明

- **Schema 擴充**：`FeatureDraft` 已新增 `id` (Feature ID), `horizon` (時序), `priority` (MoSCoW), `dependsOn` (依賴關係) 等欄位。
- **UI 支援**：在「基本資訊」步驟中新增了 「Roadmap」區段，支援設定時序與優先級，並可輸入依賴項。
- **YAML 輸出**：`yamlSerializer.ts` 已更新至 `schemaVersion: "0.2"`，會將這些 roadmap 欄位輸出至 YAML 的 `metadata` 區段。
- **Pipeline B 對接**：支援填入 Pipeline B 產出的 FT-XXX 編號，讓跨 feature 的依賴鏈可在 wizard 中延續並記錄。

### 影響

- 敏捷 roadmap 至少要能回答「現在做什麼／下一個做什麼／之後考慮」。目前無從表達。
- Pipeline B 在 Slice 階段累積的優先級判斷在跨工具交接時遺失，違反手冊的「前一階段判斷一路流到下游」設計理念。

### 建議

最小可行擴充（不破壞 `schemaVersion: 0.1` 的精神，但建議升 `0.2`）：

```ts
// model/specTypes.ts (新增)
horizon?: "now" | "next" | "later";  // 三層 roadmap horizon
priority?: "must" | "should" | "could" | "wont";  // MoSCoW
dependsOn?: string[];  // 其他 feature 的 metadata.id
```

YAML 輸出 (`yamlSerializer.ts`) 對應加入這三個欄位。`feature-seed.schema.json` 同步擴充以承接 Pipeline B 的優先級資訊。

---

## 2. INVEST / Definition of Ready 沒被驗證 ✅ 已實作 (2026-04-29)

### 實作說明

維持「驗證刻意鬆」的設計約束（不進 `blockingErrors`），新增 4 條 `category: "invest"` 的 warning，並在 ReviewPanel 以獨立分群置頂顯示。

| Warning code | 觸發條件 | 訊息 key |
|--------------|----------|----------|
| `story_missing_acceptance_criteria` | Story 完全沒有 AC | `validation.storyMissingAcceptanceCriteria` |
| `story_orphan_examples` | Story 有 example 但沒有 AC | `validation.storyOrphanExamples` |
| `draft_acceptance_criteria_without_examples` | 整份 draft 有 ≥1 條 AC 但無任何 example | `validation.draftAcceptanceCriteriaWithoutExamples` |
| `story_acceptance_criteria_not_gwt` | Story 的 AC 全數未含 Given/When/Then 三段（中英文關鍵字皆支援） | `validation.storyAcceptanceCriteriaNotGwt` |

### 對應檔案

- `src/features/spec-wizard/model/validation.ts` — 新增 4 條 warning，全部標 `category: "invest"`
- `src/features/spec-wizard/__tests__/validation.test.ts` — 11 條 INVEST 相關測試（含正反例與中英 GWT）
- `src/features/spec-wizard/components/ReviewPanel.tsx` — `warning--invest` 區塊置頂，標題 `review.investHeading`
- `src/features/spec-wizard/i18n/dictionaries.ts` — `zh-TW` / `en` 兩語系訊息齊全

### 設計約束守住

- **不阻擋下載**：4 條全部進 `warnings` 而非 `blockingErrors`，YAML 下載仍可進行。
- **AGENTS.md 「Validation is intentionally loose」精神保留**：blocking 條件仍只有 `metadata.title`、`goal.statement`、至少一個 user story 三條。
- **AI 非權威**：warning 僅提示 PO，不會自動補 AC 或 example。

### 相關 commits

`20e8f78`（orphan examples）→ `cec9ee4`（AC-without-examples）→ `8d375bd`（GWT）→ `6d924a8`（ReviewPanel 分群置頂）→ `2755a2f`（prettier 同步）。

---

## 3. successSignals 沒有可量測契約 ✅ 已實作 (2026-04-29)

### 實作說明

- **Schema 升級**：`SuccessSignal` 升為結構 `{ statement, metric?, threshold?, kind? }`，`kind` 為 `"leading" | "lagging"`。`FeatureDraft.goal.successSignals` 改採新型別。
- **向後相容**：`normalizeDraft` 把舊版 `string[]` 自動遷移成 `[{ statement }]`；`feature-seed.schema.json`、`system-brief.schema.json` 改成 `oneOf`（字串或物件），既有 reference seeds 不受影響。
- **YAML 輸出**：每條成功訊號改寫為物件，blank metric/threshold/kind 自動省略；`schemaVersion` 維持 `"0.2"`。
- **可量測 warning**：新增 `success_signals_not_measurable` warning（`messageKey: validation.successSignalsNotMeasurable`），當 draft 已有 ≥1 條成功訊號但全部都沒附 metric/threshold 時觸發；維持 non-blocking，與 #2 設計約束一致。
- **UI**：GoalStep 改成自訂陣列編輯器（statement / metric / threshold / kind 下拉）；ReviewPanel 摘要把 `(metric: ..., threshold: ..., kind: ...)` 附在 statement 之後。
- **i18n**：`zh-TW` / `en` 兩語系新增 14 條欄位字串與 `validation.successSignalsNotMeasurable`。
- **AssistService 提示**：`seedPromptBuilder.ts` 的 schema 範例同步成新物件結構，避免外部 LLM 又生成舊 `string[]`。

### 對應檔案

- `src/features/spec-wizard/model/specTypes.ts` — `SuccessSignal` / `SuccessSignalKind` type
- `src/features/spec-wizard/model/validation.ts` — 新 warning + 重構讀取路徑
- `src/features/spec-wizard/services/yamlSerializer.ts` — `cleanSuccessSignals` 物件輸出
- `src/features/spec-wizard/services/summary.ts` — markdown 摘要附帶 metric/threshold/kind
- `src/features/spec-wizard/services/seedPromptBuilder.ts` — Seed Prompt schema 範例升級
- `src/features/spec-wizard/persistence/draftStorage.ts` — 舊 `string[]` 遷移
- `src/features/spec-wizard/components/steps/GoalStep.tsx` — 4 欄位 UI
- `src/features/spec-wizard/components/ReviewPanel.tsx` — 顯示新欄位
- `src/features/spec-wizard/i18n/{messageKeys,dictionaries}.ts` — 字串補齊
- `src/features/spec-wizard/test/fixtures.ts` — `draftWithMeasurableSignal` helper 與 minimal draft 形態升級
- `docs/methodology/schemas/{feature-seed,system-brief}.schema.json` — `oneOf` 兼容
- `tests/methodology/schemas.test.ts` — 走 `normalizeDraft` 真實匯入路徑

### 設計約束守住

- **驗證仍刻意鬆**：`success_signals_not_measurable` 不進 `blockingErrors`，YAML 下載不受影響。
- **AI 非權威**：assistService 仍只回 suggestion，不會自動把模糊訊號改成可量測指標。
- **Draft 相容性**：既有 `*.json` draft 與 `*.feature-seed.json` 經 `normalizeDraft` 都能升級；新 JSON Schema 同時接受字串與物件。

---

## 4. 假設與風險缺乏可追蹤性（RAID log 不完整）✅ 已實作 (2026-04-29)

### 實作說明

- **Schema 升級**：`agentBoundaries.risks` 與 `agentBoundaries.openQuestions` 從 `string[]` 升為 `RaidEntry[]`（`{ id, text, status, mitigation? }`）。`RaidStatus = "open" | "validating" | "validated" | "invalidated"`。
- **向後相容**：`normalizeDraft` 透過 `normalizeRaidEntries` 把舊 `string[]` 自動遷移為物件陣列，id 自動生成 `R-001` / `Q-001`、status 預設 `"open"`、無 mitigation。`feature-seed.schema.json` 與 `system-brief.schema.json` 改為 `oneOf`（字串或物件），既有 reference seeds 不受影響。
- **YAML 輸出**：`agentSpec.qualityWarnings` 與 `agentSpec.openQuestions` 改寫為物件陣列，blank text / mitigation 自動省略；`schemaVersion` 維持 `"0.2"`（純加法、向後相容）。
- **UI**：新增 `RaidArray` 元件（text + status 下拉 + 可選 mitigation textarea）取代 `BoundariesStep` 中的 `<FieldArray>`；mitigation 僅在 risks 欄顯示，questions 欄關閉。
- **i18n**：`zh-TW` / `en` 兩語系新增 11 條欄位字串。
- **Seed Prompt 同步**：`seedPromptBuilder` 的 schema 範例升級為 RaidEntry，避免外部 LLM 又生成舊 `string[]`。

### 對應檔案

- `src/features/spec-wizard/model/specTypes.ts` — `RaidStatus` / `RaidEntry` type、`agentBoundaries` 型別 swap
- `src/features/spec-wizard/persistence/draftStorage.ts` — `normalizeRaidEntries` 與 `normalizeDraft` 整合
- `src/features/spec-wizard/services/yamlSerializer.ts` — `cleanRaidEntries` 物件輸出
- `src/features/spec-wizard/model/validation.ts` — text traversal 改讀 `entry.text`
- `src/features/spec-wizard/services/seedPromptBuilder.ts` — Seed Prompt schema 範例升級
- `src/features/spec-wizard/components/RaidArray.tsx` — 新元件
- `src/features/spec-wizard/components/steps/BoundariesStep.tsx` — 接 `RaidArray`
- `src/features/spec-wizard/i18n/{messageKeys,dictionaries}.ts` — 字串補齊
- `src/features/spec-wizard/test/fixtures.ts` — `draftWithRaid` helper
- `docs/methodology/schemas/{feature-seed,system-brief}.schema.json` — `oneOf` 兼容
- `tests/methodology/schemas.test.ts` — 走 oneOf 正反例

### 設計約束守住

- **驗證仍刻意鬆**：本次未新增任何 blockingError / warning（只讓既有 openQuestions warning 改讀 `entry.text`）。YAML 下載條件不變。
- **AI 非權威**：assistService 仍只回 suggestion，不會自動把 risks 升級為已驗證狀態。
- **Draft 相容性**：既有 `*.json` draft 與 `*.feature-seed.json` 經 `normalizeDraft` / `oneOf` 都能升級；新 JSON Schema 同時接受字串與物件。

---

## 5. 缺少回饋迴圈（Inspect & Adapt）

### 現況

- YAML 一旦輸出就單向斷線，AI coding agent 實作時若發現 AC 模糊，無管道回寫。
- Wizard 沒有從 YAML 反向匯入 `FeatureDraft` 的能力。

### 影響

- 違背敏捷 inspect-adapt 的核心循環。
- PO 第二次打開 wizard 時，看不到上一輪實作端發現的問題，重複犯錯。

### 建議

兩個層次，後者是 nice-to-have：

1. **YAML round-trip**：實作「YAML → FeatureDraft」反向解析。讓使用者可以把上一版 YAML 拉回來繼續編輯。對應檔案：新增 `services/yamlParser.ts` + 測試。
2. **YAML 內 feedback 區塊**：YAML 加上 `feedbackLog[]: { from: agent|human, at, note, refersTo? }`，wizard 在重新匯入時顯示在對應 AC 旁邊。

---

## 6. Pipeline B → Wizard 的銜接摩擦過高 ✅ 已實作 (2026-04-29)

### 實作說明

- **CLI 子命令**：`bin/cli.js` 新增 `import <paths>` 子命令，支援單檔、多檔、整個資料夾遞迴；對應 `bin/lib/{parseImportArgs,resolveSeedFiles,validateSeedShape,stageImport}.mjs`。
- **Stage 機制**：通過 `validateSeedShape` 的 seeds 寫入 `.vector/import/pending.json`，CLI 接著啟動 wizard。
- **Server 端 consume-on-read**：`POST /api/import-staged` 一次回傳並刪除 pending.json，避免重複匯入。對應 `src/features/spec-wizard/services/stagedImportStore.ts`。
- **Wizard 自動匯入**：`useStagedImport` hook 在 AppShell mount 時呼叫 API，逐份呼叫既有 `importDraftJson()` 灌入 draftStore；`StagedImportToast` 顯示匯入份數或部分失敗訊息。
- **設計約束守住**：`.vector/` 已在 `.gitignore`；CLI 與 server 都不寫長期狀態，仍維持「單人本地工具、無 backend 持久化」。

### 對應檔案

- `bin/cli.js`、`bin/lib/{parseImportArgs,resolveSeedFiles,validateSeedShape,stageImport}.mjs`
- `app/api/import-staged/route.ts`
- `src/features/spec-wizard/services/stagedImportStore.ts`
- `src/features/spec-wizard/hooks/useStagedImport.ts`
- `src/features/spec-wizard/components/StagedImportToast.tsx`
- `src/features/spec-wizard/components/AppShell.tsx`
- `src/features/spec-wizard/i18n/{messageKeys,dictionaries}.ts`
- `docs/methodology/pipeline-b.md`、`README.md`、`README.zh-TW.md`

### 現況

- `docs/methodology/pipeline-b.md` 寫明：「使用者把這些 JSON 直接貼進 Draft Manager」。
- 沒有 CLI 子命令、沒有資料夾批次匯入、沒有 watch mode。

### 影響

- Pipeline B 跑完拿到 N 份 feature-seed 時，N 越大摩擦越大，容易半途而廢。
- 違反「方法論手冊與 wizard 的責任邊界明確」精神中「銜接應低成本」的隱含期望。

### 建議

`bin/cli.js` 擴充：

```bash
npx vector-wizard import <path-or-glob>
# 例：npx vector-wizard import ./docs/methodology/artifacts/seeds/*.feature-seed.json
```

匯入時自動進入 wizard 並打開 Draft Manager，列出所有匯入的 draft。或更輕量：Draft Manager 支援拖曳整個資料夾。

---

## 7. 缺少最小估算欄位

### 現況

- 完全沒有估算欄位（不論 story point、T-shirt、ideal day）。
- 連粗略的 `effort` 都沒有。

### 影響

- #NoEstimates 雖是一派，但要排 roadmap（見第 1 點）通常需要粗估。
- Pipeline B 的 Slice 階段已會評估 INVEST 中的 Small，這個結果遺失了。

### 建議

選填欄位：

```ts
effort?: "xs" | "s" | "m" | "l" | "xl";
```

配合第 1 點的 `priority`、`dependsOn`，多份 feature 才能形成可視化 roadmap。

---

## 8. AI Assist 缺 calibration / 學習鉤子

### 現況

- `assistService` 是 mock，但設計上沒預留「使用者接受／拒絕建議」的 telemetry 欄位。
- 接受率無從統計，無法做 prompt 微調或偏好模型。

### 影響

- 未來接真實 LLM 時要追加這條鏈，需要破壞性改動。

### 建議

在 `api/contracts.ts` 的 `AssistResponse` 加 `suggestionId: string`，前端維護 `acceptedSuggestionIds[]`，提交時一併送回 server（即使 server 暫時不處理）。預留欄位、不擋使用流程。

---

## 9. 其他次要觀察（不單獨展開）

- **沒有版本／變更歷程**：每份 draft 沒有 changelog／edit history。敏捷重視可見的決策軌跡，可考慮在 `localStorage` 額外存一份 lightweight `revisionLog`。
- **單人工具，缺多人協作 surface**：目前無 review / comment / approval flow，但 MVP 範圍合理，列為長期觀察項。
- **DESIGN.md 已具備視覺契約**：強，無需改進。

---

## 10. 建議的 next step

不需要全部一起做。建議的優先順序與動工範圍：

| 順序 | 項目 | 改動範圍（粗估） | 對 agile 流程價值 | 狀態 |
|------|------|------------------|------------------|------|
| 1 | #1 Roadmap 欄位（horizon/priority/dependsOn） | schema + serializer + UI 顯示 | 高 | ✅ 已實作 (2026-04-28) |
| 2 | #2 INVEST warning | validation.ts + ReviewPanel | 高 | ✅ 已實作 (2026-04-29) |
| 3 | #4 RAID 結構（id + status） | schema + 簡單 UI | 中 | ✅ 已實作 (2026-04-29) |
| 4 | #3 successSignals 結構化 | schema + 選填 UI | 中 | ✅ 已實作 (2026-04-29) |
| 5 | #6 CLI import 子命令 | bin/cli.js + Draft Manager | 中 | ✅ 已實作 (2026-04-29) |
| 6 | #5 YAML round-trip | services/yamlParser.ts | 中（投入較大） | ⬜ 未開始 |
| 7 | #7 effort 欄位 | schema + UI 一個下拉 | 低工 | ⬜ 未開始 |
| 8 | #8 Assist suggestionId | contracts + 前端記錄 | 預留型 | ⬜ 未開始 |

第 1 + 第 2 是「最划算的兩刀」：打通 Pipeline B → wizard 的優先序鏈，並讓 PO 看見 INVEST 落差，但仍維持 wizard「驗證刻意鬆」的設計約束——兩項皆已於 2026-04-29 前完成，未破壞既有測試與 draft 相容性（`schemaVersion` 已升至 `0.2`）。RAID 結構（#4）亦於 2026-04-29 完成升級，敏捷品質三件套（INVEST / successSignals / RAID）齊備。下一個建議啟動的項目為 **#5 YAML round-trip**（讓 wizard 能反向吃回上一輪 YAML，閉合 inspect-adapt 迴圈）。

---

## 11. 不在本次分析範圍

- 商業面（Path A：Lean Canvas／OKR）— MVP 外。
- 用戶痛點面（Path C：Opportunity Solution Tree）— MVP 外。
- LLM provider 串接細節（assist 真實化）— 等 #8 的 calibration 鉤子先就位。
- 多人協作／權限模型 — 與「單人本地工具」基本前提衝突，需先有產品決策。

---

_本文件為分析記錄，後續若據此啟動實作，應在 `docs/superpowers/plans/` 另開對應 plan 檔。_
