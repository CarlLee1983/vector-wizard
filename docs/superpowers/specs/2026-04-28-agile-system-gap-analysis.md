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

## 2. INVEST / Definition of Ready 沒被驗證 ⭐ 高 CP 值

### 現況

- `validation.ts` 只 block 三條：`metadata.title`、`goal.statement`、至少一個 user story。
- Story 可以沒有 acceptance criteria、沒有 example，仍能通過驗證並下載 YAML。
- AGENTS.md 明文「Validation is intentionally loose」是設計選擇，不應改為 blocking。

### 影響

- 違背 Story 的 Ready 最低標準（INVEST 中 Testable / Negotiable）。
- AI coding agent 拿到沒有 AC 的 story 時，要不就拒絕、要不就自行腦補（破壞「AI 非權威」原則的下游版本）。

### 建議

維持「不阻擋下載」，但**新增 warning 等級的提示**並在 ReviewPanel 醒目顯示：

- Story 沒有任何 AC → warning「建議至少一條驗收條件」
- AC 數量為 0 但有 example → warning「examples 應對應到 AC」
- 整份 draft 有 ≥1 個 AC 但無任何 example → warning「建議每條 AC 有具體例子」
- （選用）支援 GWT 格式 hint：當 AC 文字未含 Given/When/Then 三段，提示可改寫為 GWT。

對應檔案：`model/validation.ts`、`__tests__/validation.test.ts`、`components/ReviewPanel.tsx`。

---

## 3. successSignals 沒有可量測契約

### 現況

- Frame 階段沉澱的 `successSignals` 一路流到 wizard，但在 `system-brief.schema.json` 與 `feature-seed.schema.json` 中都是字串陣列，無結構。
- Wizard 內也沒有對應的 metric / threshold / measurement 欄位。

### 影響

- 「成功訊號」不可被否證 → 違背敏捷的 build–measure–learn。
- 回顧 sprint 時，無法以這份 spec 作為「達成 vs 未達成」的判斷基準。

### 建議

把 `successSignal` 從 `string` 升級為結構：

```json
{
  "statement": "註冊轉換率提升 15%",
  "metric": "signup_completion_rate",
  "threshold": "> 0.15",
  "kind": "leading"
}
```

`metric` 與 `threshold` 為選填，避免讓非技術 PO 卡關。Wizard 在 ReviewPanel 應提示「未設定可量測指標」（warning，不阻擋）。

---

## 4. 假設與風險缺乏可追蹤性（RAID log 不完整）

### 現況

- `riskiestAssumptions`、`openQuestions` 在 schema 是平鋪 string 陣列。
- 沒有 severity / likelihood / owner / status 欄位。

### 影響

- 敏捷下假設應「驗證 → 標記狀態 → 影響 backlog」，目前只能寫下不能追蹤。
- 多次迭代後無法回答「上輪假設驗證結果如何？哪些已被推翻？」

### 建議

升級結構：

```json
{
  "id": "A-001",
  "text": "使用者願意多花一步驟換取更快結帳",
  "status": "open" | "validating" | "validated" | "invalidated",
  "mitigation": "提供 fallback 流程"
}
```

最低改動：先加 `id` 與 `status`，其他選填。對應升級 `feature-seed.schema.json`、`system-brief.schema.json`、wizard 的 `risks` 欄位。

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

## 6. Pipeline B → Wizard 的銜接摩擦過高

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

| 順序 | 項目 | 改動範圍（粗估） | 對 agile 流程價值 |
|------|------|------------------|------------------|
| 1 | #1 Roadmap 欄位（horizon/priority/dependsOn） | schema + serializer + UI 顯示 | 高 |
| 2 | #2 INVEST warning | validation.ts + ReviewPanel | 高 |
| 3 | #4 RAID 結構（id + status） | schema + 簡單 UI | 中 |
| 4 | #3 successSignals 結構化 | schema + 選填 UI | 中 |
| 5 | #6 CLI import 子命令 | bin/cli.js + Draft Manager | 中 |
| 6 | #5 YAML round-trip | services/yamlParser.ts | 中（投入較大） |
| 7 | #7 effort 欄位 | schema + UI 一個下拉 | 低工 |
| 8 | #8 Assist suggestionId | contracts + 前端記錄 | 預留型 |

第 1 + 第 2 是「最划算的兩刀」：打通 Pipeline B → wizard 的優先序鏈，並讓 PO 看見 INVEST 落差，但仍維持 wizard「驗證刻意鬆」的設計約束。皆可在不破壞既有測試與既有 draft 相容性的前提下完成（建議 `schemaVersion` 升 `0.2`，舊 draft 自動補 default 值）。

---

## 11. 不在本次分析範圍

- 商業面（Path A：Lean Canvas／OKR）— MVP 外。
- 用戶痛點面（Path C：Opportunity Solution Tree）— MVP 外。
- LLM provider 串接細節（assist 真實化）— 等 #8 的 calibration 鉤子先就位。
- 多人協作／權限模型 — 與「單人本地工具」基本前提衝突，需先有產品決策。

---

_本文件為分析記錄，後續若據此啟動實作，應在 `docs/superpowers/plans/` 另開對應 plan 檔。_
