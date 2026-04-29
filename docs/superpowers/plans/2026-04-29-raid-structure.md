# RAID 結構化實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `agentBoundaries.risks` 與 `agentBoundaries.openQuestions` 從扁平 `string[]` 升級為 `RaidEntry[]`（`{ id, text, status, mitigation? }`），讓敏捷流程下的「假設 → 驗證 → 標記狀態 → 影響 backlog」可被追蹤；同步把 `feature-seed.schema.json` 與 `system-brief.schema.json` 升級為 `oneOf`（字串或物件），既有 reference seeds 不受影響。

**Architecture:** 與 successSignals 升級採同一套 playbook——新增共享 `RaidEntry` 型別，`normalizeDraft` 在載入時把舊版 `string[]` 自動遷移為 `RaidEntry[]`（id 自動生成 `R-001` / `Q-001`、status 預設 `"open"`、無 mitigation），YAML 輸出永遠是物件形式（blank `mitigation` 自動省略），`schemaVersion` 維持 `"0.2"`（純加法、向後相容）。UI 新增 `RaidArray` 元件（text 輸入 + status 下拉 + 可選 mitigation textarea），取代 `BoundariesStep` 中 risks 與 openQuestions 兩處的 `<FieldArray>`；mitigation 僅在 risks 欄顯示，questions 欄不顯示（DRY 共用型別、UI 各別決定欄位曝光）。`AGENTS.md` 的 invariant 章節無需動（schemaVersion 不變）。

**Tech Stack:** TypeScript（嚴格 nullable）、Next.js 15 App Router、React 19、Vitest（jsdom）、Bun、JSON Schema draft-07、Ajv 8。

---

## File Structure

| 檔案 | 變更類型 | 責任 |
|------|---------|------|
| `src/features/spec-wizard/model/specTypes.ts` | Modify | 新增 `RaidStatus` / `RaidEntry` 型別；`agentBoundaries.risks` 與 `openQuestions` 改為 `RaidEntry[]` |
| `src/features/spec-wizard/persistence/draftStorage.ts` | Modify | 新增 `normalizeRaidEntries` 函式；`normalizeDraft` 對舊 `string[]` 自動遷移為物件陣列 |
| `src/features/spec-wizard/services/yamlSerializer.ts` | Modify | 新增 `cleanRaidEntries` 函式；`agentSpec.qualityWarnings` 與 `agentSpec.openQuestions` 輸出物件陣列（blank `mitigation` 省略） |
| `src/features/spec-wizard/model/validation.ts` | Modify | `draftTextValues` 改讀 `entry.text`；`openQuestions` warning 迴圈改為 `entry.text` |
| `src/features/spec-wizard/services/seedPromptBuilder.ts` | Modify | Schema 範例升級為 RaidEntry 物件結構，避免外部 LLM 又生成舊 `string[]` |
| `src/features/spec-wizard/i18n/messageKeys.ts` | Modify | 新增 11 個 MessageKey union 成員（status 4 + mitigation 3 + raidId 2 + raidStatus 2） |
| `src/features/spec-wizard/i18n/dictionaries.ts` | Modify | zh-TW / en 各補對應字串 |
| `src/features/spec-wizard/components/RaidArray.tsx` | Create | 新元件：text + status 下拉 + 可選 mitigation textarea |
| `src/features/spec-wizard/components/steps/BoundariesStep.tsx` | Modify | risks 與 openQuestions 兩處從 `<FieldArray>` 換成 `<RaidArray>`（risks 開啟 mitigation、questions 關閉） |
| `src/features/spec-wizard/test/fixtures.ts` | Modify | 新增 `draftWithRaid()` 工廠 |
| `src/features/spec-wizard/__tests__/draftStorage.test.ts` | Modify | 補 RAID 遷移測試（string→object、status 預設、id 自動生成、混合輸入） |
| `src/features/spec-wizard/__tests__/yamlSerializer.test.ts` | Modify | 補 RAID 輸出測試（物件結構、mitigation 省略、空陣列處理） |
| `src/features/spec-wizard/__tests__/raidArray.test.tsx` | Create | RaidArray 元件單元測試（render / 編輯 / status 切換 / mitigation 開關） |
| `docs/methodology/schemas/feature-seed.schema.json` | Modify | `agentBoundaries.risks` 與 `openQuestions` 改為 `oneOf`（string 或 RaidEntry 物件） |
| `docs/methodology/schemas/system-brief.schema.json` | Modify | `riskiestAssumptions` 與 `openQuestions` 改為 `oneOf` |
| `tests/methodology/schemas.test.ts` | Modify | 補新 oneOf 形式的正反例測試 |
| `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md` | Modify | §4 標 ✅ 已實作 (2026-04-29)；§10 表格更新狀態欄 |

---

## Task 1: 新增 `RaidStatus` / `RaidEntry` 型別與遷移輔助函式

**Files:**
- Modify: `src/features/spec-wizard/model/specTypes.ts:55-93`
- Modify: `src/features/spec-wizard/persistence/draftStorage.ts:1-25`
- Modify: `src/features/spec-wizard/__tests__/draftStorage.test.ts`

**目的：** 先把型別與遷移函式單獨建立，但 `agentBoundaries.risks` / `openQuestions` 仍維持 `string[]`，以保持其他檔案不爆炸。下個任務再做型別 swap。

- [ ] **Step 1: 新增遷移函式單元測試（紅）**

在 `src/features/spec-wizard/__tests__/draftStorage.test.ts` 末尾、最後一個 `it` 之後（第 160 行附近）插入新的 `describe` 區塊：

```ts
import { normalizeRaidEntries } from "../persistence/draftStorage"

describe("normalizeRaidEntries", () => {
  it("converts a legacy string into a RaidEntry with default status and auto id", () => {
    const result = normalizeRaidEntries(["既有查詢層在規模化下效能不足"], "R")
    expect(result).toEqual([
      { id: "R-001", text: "既有查詢層在規模化下效能不足", status: "open" }
    ])
  })

  it("preserves explicit id, status and mitigation when present", () => {
    const result = normalizeRaidEntries(
      [{ id: "R-042", text: "Token expiry edge case", status: "validating", mitigation: "Refresh quietly" }],
      "R"
    )
    expect(result).toEqual([
      { id: "R-042", text: "Token expiry edge case", status: "validating", mitigation: "Refresh quietly" }
    ])
  })

  it("falls back to default id when entry id is missing or empty", () => {
    const result = normalizeRaidEntries([{ text: "Missing id", status: "open" }, { id: "", text: "Empty id" }], "Q")
    expect(result).toEqual([
      { id: "Q-001", text: "Missing id", status: "open" },
      { id: "Q-002", text: "Empty id", status: "open" }
    ])
  })

  it("falls back to status 'open' when status is unknown or missing", () => {
    const result = normalizeRaidEntries(
      [{ id: "R-001", text: "Bad status", status: "bogus" }, { id: "R-002", text: "No status" }],
      "R"
    )
    expect(result[0].status).toBe("open")
    expect(result[1].status).toBe("open")
  })

  it("drops blank mitigation strings", () => {
    const result = normalizeRaidEntries(
      [{ id: "R-001", text: "x", status: "open", mitigation: "   " }],
      "R"
    )
    expect(result[0].mitigation).toBeUndefined()
  })

  it("handles a mixed array of strings and objects", () => {
    const result = normalizeRaidEntries(
      ["legacy entry", { id: "R-007", text: "structured", status: "validated" }],
      "R"
    )
    expect(result).toEqual([
      { id: "R-001", text: "legacy entry", status: "open" },
      { id: "R-007", text: "structured", status: "validated" }
    ])
  })

  it("returns an empty array for non-array input", () => {
    expect(normalizeRaidEntries(undefined, "R")).toEqual([])
    expect(normalizeRaidEntries(null, "R")).toEqual([])
    expect(normalizeRaidEntries("not an array", "R")).toEqual([])
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/draftStorage.test.ts -t "normalizeRaidEntries"
```

預期：FAIL，輸出 `normalizeRaidEntries is not a function` 或 import 錯誤。

- [ ] **Step 3: 新增 `RaidStatus` / `RaidEntry` 型別**

在 `src/features/spec-wizard/model/specTypes.ts` 第 62 行（`SuccessSignal` 區塊之後）新增：

```ts
export type RaidStatus = "open" | "validating" | "validated" | "invalidated"

export type RaidEntry = {
  id: string
  text: string
  status: RaidStatus
  mitigation?: string
}
```

注意：本 task 暫不修改 `FeatureDraft.agentBoundaries.risks` / `openQuestions` 的型別（仍維持 `string[]`），改在 Task 2 做 swap。

- [ ] **Step 4: 實作 `normalizeRaidEntries`**

在 `src/features/spec-wizard/persistence/draftStorage.ts` 第 1 行（既有 import）改成：

```ts
import type { FeatureDraft, RaidEntry, RaidStatus, SuccessSignal, SuccessSignalKind } from "../model/specTypes"

const RAID_STATUSES: readonly RaidStatus[] = ["open", "validating", "validated", "invalidated"]
```

接著在 `normalizeSuccessSignal` 之後（第 25 行附近）新增：

```ts
export function normalizeRaidEntries(value: unknown, prefix: "R" | "Q"): RaidEntry[] {
  if (!Array.isArray(value)) return []
  return value.map((item, index): RaidEntry => {
    const fallbackId = `${prefix}-${String(index + 1).padStart(3, "0")}`
    if (typeof item === "string") {
      return { id: fallbackId, text: item, status: "open" }
    }
    if (item && typeof item === "object") {
      const raw = item as Record<string, unknown>
      const id = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id : fallbackId
      const text = typeof raw.text === "string" ? raw.text : ""
      const status =
        typeof raw.status === "string" && (RAID_STATUSES as readonly string[]).includes(raw.status)
          ? (raw.status as RaidStatus)
          : "open"
      const mitigation =
        typeof raw.mitigation === "string" && raw.mitigation.trim().length > 0 ? raw.mitigation : undefined
      const entry: RaidEntry = { id, text, status }
      if (mitigation) entry.mitigation = mitigation
      return entry
    }
    return { id: fallbackId, text: "", status: "open" }
  })
}
```

- [ ] **Step 5: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/draftStorage.test.ts -t "normalizeRaidEntries"
```

預期：所有 7 條 `normalizeRaidEntries` 測試 PASS；其他既有測試也 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/model/specTypes.ts src/features/spec-wizard/persistence/draftStorage.ts src/features/spec-wizard/__tests__/draftStorage.test.ts
git commit -m "feat: [spec-wizard] 新增 RaidEntry 型別與遷移輔助函式 (#4)"
```

---

## Task 2: 把 `agentBoundaries.risks` / `openQuestions` 切換為 `RaidEntry[]`

**Files:**
- Modify: `src/features/spec-wizard/model/specTypes.ts:86-92`
- Modify: `src/features/spec-wizard/persistence/draftStorage.ts:102-110`
- Modify: `src/features/spec-wizard/model/validation.ts:54-58`、`260-269`
- Modify: `src/features/spec-wizard/services/yamlSerializer.ts:139-140`
- Modify: `src/features/spec-wizard/components/steps/BoundariesStep.tsx:32-50`
- Modify: `src/features/spec-wizard/__tests__/draftStorage.test.ts`

**目的：** 把型別 swap 一次到位，所有舊 consumer 同時調整成讀 `entry.text`，YAML serializer 暫時直接把物件陣列轉成 `entry.text` 字串清單（保持 YAML 輸出 backward compat）。BoundariesStep 暫時用 wrapper 把 `RaidEntry[]` 投影成 `string[]` 讓既有 `<FieldArray>` 繼續顯示（status 編輯 UI 會在 Task 7 補）。

- [ ] **Step 1: 新增「draftStorage 遷移後 risks/openQuestions 是 RaidEntry[]」測試（紅）**

在 `src/features/spec-wizard/__tests__/draftStorage.test.ts` 第 160 行（`"preserves roadmap fields when present in JSON"` 之後）新增：

```ts
  it("migrates legacy string risks into RaidEntry array on load", () => {
    const legacyJson = JSON.stringify({
      metadata: { title: "Legacy", locale: "en" },
      summary: {},
      goal: { statement: "x", successSignals: [] },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: {
        nonGoals: [],
        constraints: [],
        testExpectations: [],
        risks: ["既有查詢層在規模化下效能不足", "團隊仍回頭用試算表"],
        openQuestions: ["儀表板 schema 由誰負責定義？"]
      }
    })

    const draft = draftFromJson(legacyJson)

    expect(draft.agentBoundaries.risks).toEqual([
      { id: "R-001", text: "既有查詢層在規模化下效能不足", status: "open" },
      { id: "R-002", text: "團隊仍回頭用試算表", status: "open" }
    ])
    expect(draft.agentBoundaries.openQuestions).toEqual([
      { id: "Q-001", text: "儀表板 schema 由誰負責定義？", status: "open" }
    ])
  })

  it("preserves structured RaidEntry fields when JSON already has them", () => {
    const json = JSON.stringify({
      metadata: { title: "Structured", locale: "en" },
      summary: {},
      goal: { statement: "x", successSignals: [] },
      impacts: [],
      deliverables: [],
      userActivities: [],
      epics: [
        {
          id: "EP-001",
          title: "e",
          stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
        }
      ],
      agentBoundaries: {
        nonGoals: [],
        constraints: [],
        testExpectations: [],
        risks: [{ id: "R-007", text: "Token edge case", status: "validating", mitigation: "Refresh quietly" }],
        openQuestions: [{ id: "Q-003", text: "PII rules?", status: "validated" }]
      }
    })

    const draft = draftFromJson(json)

    expect(draft.agentBoundaries.risks).toEqual([
      { id: "R-007", text: "Token edge case", status: "validating", mitigation: "Refresh quietly" }
    ])
    expect(draft.agentBoundaries.openQuestions).toEqual([{ id: "Q-003", text: "PII rules?", status: "validated" }])
  })
```

接著修改既有「loads legacy draft (no roadmap fields)」測試的斷言（第 56-59 行附近 `expect(draft.metadata.dependsOn).toBeUndefined()` 之後）追加：

```ts
    expect(draft.agentBoundaries.risks).toEqual([])
    expect(draft.agentBoundaries.openQuestions).toEqual([])
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/draftStorage.test.ts
```

預期：兩條新測試 FAIL（normalizeDraft 還沒呼叫 normalizeRaidEntries）。

- [ ] **Step 3: 修改 `FeatureDraft.agentBoundaries` 型別**

在 `src/features/spec-wizard/model/specTypes.ts` 第 86-92 行的 `agentBoundaries` 區塊改成：

```ts
  agentBoundaries: {
    nonGoals: string[]
    constraints: string[]
    testExpectations: string[]
    risks: RaidEntry[]
    openQuestions: RaidEntry[]
  }
```

- [ ] **Step 4: 在 `normalizeDraft` 呼叫遷移函式**

在 `src/features/spec-wizard/persistence/draftStorage.ts` 第 102-110 行的 `agentBoundaries` 區塊改成：

```ts
    agentBoundaries: {
      nonGoals: Array.isArray(draft.agentBoundaries?.nonGoals) ? draft.agentBoundaries.nonGoals : [],
      constraints: Array.isArray(draft.agentBoundaries?.constraints) ? draft.agentBoundaries.constraints : [],
      testExpectations: Array.isArray(draft.agentBoundaries?.testExpectations)
        ? draft.agentBoundaries.testExpectations
        : [],
      risks: normalizeRaidEntries(draft.agentBoundaries?.risks, "R"),
      openQuestions: normalizeRaidEntries(draft.agentBoundaries?.openQuestions, "Q")
    }
```

- [ ] **Step 5: 修正 `validation.ts` 的 text traversal**

在 `src/features/spec-wizard/model/validation.ts` 第 54-58 行（`draftTextValues` 中對 risks / openQuestions 的展開）改成：

```ts
    ...draft.agentBoundaries.risks.map((entry) => entry.text),
    ...draft.agentBoundaries.openQuestions.map((entry) => entry.text)
```

接著第 260-269 行 openQuestions warning 迴圈改成：

```ts
  const openQuestions = nonBlankItems(draft.agentBoundaries.openQuestions.map((entry) => entry.text))
  if (openQuestions.length > 0) {
    for (const question of openQuestions) {
      warnings.push({
        code: `open_question_${question.slice(0, 10)}`,
        fieldPath: "agentBoundaries.openQuestions",
        message: draft.metadata.locale === "zh-TW" ? `待釐清問題：${question}` : `Open Question: ${question}`
      })
    }
  }
```

- [ ] **Step 6: 暫時讓 yamlSerializer 仍輸出字串（保持 YAML 不變）**

在 `src/features/spec-wizard/services/yamlSerializer.ts` 第 139-140 行的 `agentSpec` 區塊改成：

```ts
      qualityWarnings: cleanList(draft.agentBoundaries.risks.map((entry) => entry.text)),
      openQuestions: cleanList(draft.agentBoundaries.openQuestions.map((entry) => entry.text))
```

注意：這只是暫時相容；Task 3 會把它升級為輸出物件結構並補測試。

- [ ] **Step 7: 暫時讓 `BoundariesStep` 用投影 wrapper 接 `<FieldArray>`**

在 `src/features/spec-wizard/components/steps/BoundariesStep.tsx` 第 33-50 行（risks 與 openQuestions 兩個 `<FieldArray>`）改成：

```tsx
      <FieldArray
        label={t("field.risks")}
        help={t("field.risksHelp")}
        helpId="risks-help"
        placeholder={t("field.risksPlaceholder")}
        values={draft.agentBoundaries.risks.map((entry) => entry.text)}
        onChange={(texts) =>
          setDraft({
            ...draft,
            agentBoundaries: {
              ...draft.agentBoundaries,
              risks: texts.map((text, index) => ({
                id: draft.agentBoundaries.risks[index]?.id ?? `R-${String(index + 1).padStart(3, "0")}`,
                text,
                status: draft.agentBoundaries.risks[index]?.status ?? "open",
                ...(draft.agentBoundaries.risks[index]?.mitigation
                  ? { mitigation: draft.agentBoundaries.risks[index]!.mitigation! }
                  : {})
              }))
            }
          })
        }
      />
      <FieldArray
        label={t("field.openQuestions")}
        help={t("field.openQuestionsHelp")}
        helpId="open-questions-help"
        placeholder={t("field.openQuestionsPlaceholder")}
        values={draft.agentBoundaries.openQuestions.map((entry) => entry.text)}
        onChange={(texts) =>
          setDraft({
            ...draft,
            agentBoundaries: {
              ...draft.agentBoundaries,
              openQuestions: texts.map((text, index) => ({
                id: draft.agentBoundaries.openQuestions[index]?.id ?? `Q-${String(index + 1).padStart(3, "0")}`,
                text,
                status: draft.agentBoundaries.openQuestions[index]?.status ?? "open"
              }))
            }
          })
        }
      />
```

注意：Task 7 會把這兩個 wrapper 換掉，改用 `<RaidArray>`，但本 task 先讓 UI 不爆炸。

- [ ] **Step 8: fixtures.ts 對應型別不需改字面值**

`src/features/spec-wizard/test/fixtures.ts` 第 38-44 行 `agentBoundaries` 區塊不需改（`risks: []`、`openQuestions: []` 仍是合法的 `RaidEntry[]`）。本 step 僅確認 `bunx vitest run` 不報型別錯。

- [ ] **Step 9: 跑全部測試確認通過**

```bash
bunx vitest run
```

預期：全部測試通過。

- [ ] **Step 10: 跑型別檢查**

```bash
npx tsc --noEmit
```

預期：無錯誤。

- [ ] **Step 11: Commit**

```bash
git add src/features/spec-wizard/model/specTypes.ts src/features/spec-wizard/model/validation.ts src/features/spec-wizard/persistence/draftStorage.ts src/features/spec-wizard/services/yamlSerializer.ts src/features/spec-wizard/components/steps/BoundariesStep.tsx src/features/spec-wizard/__tests__/draftStorage.test.ts
git commit -m "refactor: [spec-wizard] agentBoundaries.risks / openQuestions 改為 RaidEntry[] 並補遷移 (#4)"
```

---

## Task 3: YAML serializer 輸出結構化 RAID 物件

**Files:**
- Modify: `src/features/spec-wizard/services/yamlSerializer.ts:1-25`、`135-141`
- Modify: `src/features/spec-wizard/test/fixtures.ts`
- Modify: `src/features/spec-wizard/__tests__/yamlSerializer.test.ts`

**目的：** 把暫時相容的 `cleanList(...map text)` 升級為 `cleanRaidEntries`，輸出 `[{ id, text, status, mitigation? }]`。為下游 AI agent 提供可追蹤性。

- [ ] **Step 1: 在 fixtures.ts 新增 `draftWithRaid()` 工廠**

在 `src/features/spec-wizard/test/fixtures.ts` 末尾（第 89 行之後）新增：

```ts
export function draftWithRaid(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.agentBoundaries.risks = [
    { id: "R-001", text: "Token expiry edge case", status: "validating", mitigation: "Refresh quietly in background" },
    { id: "R-002", text: "Cold-start latency on serverless", status: "open" }
  ]
  draft.agentBoundaries.openQuestions = [
    { id: "Q-001", text: "Should we support kiosk printing?", status: "open" }
  ]
  return draft
}
```

- [ ] **Step 2: 新增 RAID YAML 輸出測試（紅）**

在 `src/features/spec-wizard/__tests__/yamlSerializer.test.ts` 末尾的 `it("builds a human-readable summary"...)` 之前插入：

```ts
  it("emits structured RaidEntry objects in agentSpec.qualityWarnings", () => {
    const draft = draftWithRaid()
    const normalized = normalizeDraftForExport(draft, "2026-04-29")

    expect(normalized.agentSpec.qualityWarnings).toEqual([
      { id: "R-001", text: "Token expiry edge case", status: "validating", mitigation: "Refresh quietly in background" },
      { id: "R-002", text: "Cold-start latency on serverless", status: "open" }
    ])
  })

  it("emits structured RaidEntry objects in agentSpec.openQuestions", () => {
    const draft = draftWithRaid()
    const normalized = normalizeDraftForExport(draft, "2026-04-29")

    expect(normalized.agentSpec.openQuestions).toEqual([
      { id: "Q-001", text: "Should we support kiosk printing?", status: "open" }
    ])
  })

  it("omits blank text and blank mitigation in RAID YAML output", () => {
    const draft = draftWithRaid()
    draft.agentBoundaries.risks = [
      { id: "R-001", text: "   ", status: "open" },
      { id: "R-002", text: "Real risk", status: "open", mitigation: "   " }
    ]
    const normalized = normalizeDraftForExport(draft, "2026-04-29")

    expect(normalized.agentSpec.qualityWarnings).toEqual([{ id: "R-002", text: "Real risk", status: "open" }])
  })

  it("returns empty arrays when RAID lists are empty", () => {
    const draft = minimalValidDraft()
    const normalized = normalizeDraftForExport(draft, "2026-04-29")

    expect(normalized.agentSpec.qualityWarnings).toEqual([])
    expect(normalized.agentSpec.openQuestions).toEqual([])
  })
```

並在檔案頂端 import 處新增 `draftWithRaid`：

```ts
import { draftWithRaid, draftWithRoadmap, minimalValidDraft } from "../test/fixtures"
```

- [ ] **Step 3: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts -t "RaidEntry"
```

預期：FAIL，現有 yaml 仍輸出純字串清單。

- [ ] **Step 4: 新增 `cleanRaidEntries` 函式**

在 `src/features/spec-wizard/services/yamlSerializer.ts` 第 1 行 import 改成：

```ts
import type { FeatureDraft, RaidEntry, SuccessSignal } from "../model/specTypes"
```

接著在 `cleanSuccessSignals` 之後（第 25 行附近）新增：

```ts
function cleanRaidEntries(entries: RaidEntry[]) {
  return entries
    .filter((entry) => cleanString(entry.text).length > 0)
    .map((entry) => {
      const mitigation = cleanString(entry.mitigation)
      return {
        id: entry.id,
        text: cleanString(entry.text),
        status: entry.status,
        ...(mitigation ? { mitigation } : {})
      }
    })
}
```

- [ ] **Step 5: 把 `agentSpec` 改為呼叫新函式**

在 `src/features/spec-wizard/services/yamlSerializer.ts` 第 135-141 行的 `agentSpec` 區塊改成：

```ts
    agentSpec: {
      nonGoals: cleanList(draft.agentBoundaries.nonGoals),
      constraints: cleanList(draft.agentBoundaries.constraints),
      testExpectations: cleanList(draft.agentBoundaries.testExpectations),
      qualityWarnings: cleanRaidEntries(draft.agentBoundaries.risks),
      openQuestions: cleanRaidEntries(draft.agentBoundaries.openQuestions)
    }
```

- [ ] **Step 6: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts
```

預期：所有測試 PASS（含 4 條新 RAID 測試與既有測試）。

- [ ] **Step 7: 跑全部測試確認沒有 regression**

```bash
bunx vitest run
```

預期：全綠。

- [ ] **Step 8: Commit**

```bash
git add src/features/spec-wizard/services/yamlSerializer.ts src/features/spec-wizard/test/fixtures.ts src/features/spec-wizard/__tests__/yamlSerializer.test.ts
git commit -m "feat: [spec-wizard] yamlSerializer 輸出結構化 RAID 物件 (#4)"
```

---

## Task 4: JSON Schemas 加上 `oneOf` 接受新舊兩種形式

**Files:**
- Modify: `docs/methodology/schemas/feature-seed.schema.json:172-178`
- Modify: `docs/methodology/schemas/system-brief.schema.json:71-73`
- Modify: `tests/methodology/schemas.test.ts`

- [ ] **Step 1: 新增 schema 接受 RaidEntry 物件的測試（紅）**

在 `tests/methodology/schemas.test.ts` 的 `describe("feature-seed schema", ...)` 區塊內，最後一個 `it("schema is valid JSON Schema"...)` 之前插入：

```ts
  it("accepts feature-seed with structured RaidEntry risks and openQuestions", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const validate = ajv.compile(schema)
    const fixture = {
      ...goodFixture,
      agentBoundaries: {
        ...goodFixture.agentBoundaries,
        risks: [{ id: "R-001", text: "查詢效能不足", status: "validating", mitigation: "加 index" }],
        openQuestions: [{ id: "Q-001", text: "schema 由誰定義？", status: "open" }]
      }
    }
    expect(validate(fixture)).toBe(true)
  })

  it("rejects RaidEntry without required text", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const validate = ajv.compile(schema)
    const fixture = {
      ...goodFixture,
      agentBoundaries: {
        ...goodFixture.agentBoundaries,
        risks: [{ id: "R-001", status: "open" }]
      }
    }
    expect(validate(fixture)).toBe(false)
  })

  it("rejects RaidEntry with invalid status", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const validate = ajv.compile(schema)
    const fixture = {
      ...goodFixture,
      agentBoundaries: {
        ...goodFixture.agentBoundaries,
        risks: [{ id: "R-001", text: "x", status: "bogus" }]
      }
    }
    expect(validate(fixture)).toBe(false)
  })
```

接著在 `describe("system-brief schema", ...)` 區塊內，最後一個 `it("schema is valid JSON Schema"...)` 之前插入：

```ts
  it("accepts system-brief with structured riskiestAssumptions and openQuestions", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    const validate = ajv.compile(schema)
    const fixture = {
      ...goodFixture,
      riskiestAssumptions: [{ id: "R-001", text: "Query layer scales", status: "validating", mitigation: "Indexes" }],
      openQuestions: [{ id: "Q-001", text: "Who owns dashboards?", status: "open" }]
    }
    expect(validate(fixture)).toBe(true)
  })
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run tests/methodology/schemas.test.ts
```

預期：3 條 feature-seed 測試與 1 條 system-brief 測試 FAIL（schema 還沒接受物件形式）。

- [ ] **Step 3: 升級 `feature-seed.schema.json`**

在 `docs/methodology/schemas/feature-seed.schema.json` 第 172-178 行的 `agentBoundaries.properties` 區塊把 `risks` 與 `openQuestions` 改成：

```json
        "risks": {
          "type": "array",
          "items": {
            "oneOf": [
              { "type": "string" },
              {
                "type": "object",
                "required": ["id", "text", "status"],
                "additionalProperties": false,
                "properties": {
                  "id": { "type": "string", "minLength": 1 },
                  "text": { "type": "string", "minLength": 1 },
                  "status": { "type": "string", "enum": ["open", "validating", "validated", "invalidated"] },
                  "mitigation": { "type": "string" }
                }
              }
            ]
          }
        },
        "openQuestions": {
          "type": "array",
          "items": {
            "oneOf": [
              { "type": "string" },
              {
                "type": "object",
                "required": ["id", "text", "status"],
                "additionalProperties": false,
                "properties": {
                  "id": { "type": "string", "minLength": 1 },
                  "text": { "type": "string", "minLength": 1 },
                  "status": { "type": "string", "enum": ["open", "validating", "validated", "invalidated"] },
                  "mitigation": { "type": "string" }
                }
              }
            ]
          }
        }
```

- [ ] **Step 4: 升級 `system-brief.schema.json`**

在 `docs/methodology/schemas/system-brief.schema.json` 第 72-73 行把 `riskiestAssumptions` 與 `openQuestions` 改成（與 feature-seed 相同的 `oneOf` 結構）：

```json
    "riskiestAssumptions": {
      "type": "array",
      "items": {
        "oneOf": [
          { "type": "string", "minLength": 1 },
          {
            "type": "object",
            "required": ["id", "text", "status"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string", "minLength": 1 },
              "text": { "type": "string", "minLength": 1 },
              "status": { "type": "string", "enum": ["open", "validating", "validated", "invalidated"] },
              "mitigation": { "type": "string" }
            }
          }
        ]
      }
    },
    "openQuestions": {
      "type": "array",
      "items": {
        "oneOf": [
          { "type": "string", "minLength": 1 },
          {
            "type": "object",
            "required": ["id", "text", "status"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string", "minLength": 1 },
              "text": { "type": "string", "minLength": 1 },
              "status": { "type": "string", "enum": ["open", "validating", "validated", "invalidated"] },
              "mitigation": { "type": "string" }
            }
          }
        ]
      }
    }
```

- [ ] **Step 5: 跑測試確認通過**

```bash
bunx vitest run tests/methodology/schemas.test.ts
```

預期：所有測試 PASS。`reference-case sweep` 也應全綠（既有 `*.feature-seed.json` 仍是字串陣列、被 `oneOf` 接受）。

- [ ] **Step 6: Commit**

```bash
git add docs/methodology/schemas/feature-seed.schema.json docs/methodology/schemas/system-brief.schema.json tests/methodology/schemas.test.ts
git commit -m "feat: [methodology] schemas 接受結構化 RaidEntry（oneOf 相容字串）(#4)"
```

---

## Task 5: 新增 RAID 相關 i18n keys

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`

**目的：** 為 Task 6 的 `RaidArray` 元件鋪好 i18n 字串。

- [ ] **Step 1: 擴充 MessageKey union**

在 `src/features/spec-wizard/i18n/messageKeys.ts` 第 202 行（最後一個 `| "priority.unset"` 之後）追加：

```ts
  | "field.raidId"
  | "field.raidIdHelp"
  | "field.raidStatus"
  | "field.raidStatusHelp"
  | "raidStatus.open"
  | "raidStatus.validating"
  | "raidStatus.validated"
  | "raidStatus.invalidated"
  | "field.riskMitigation"
  | "field.riskMitigationHelp"
  | "field.riskMitigationPlaceholder"
```

- [ ] **Step 2: 補 zh-TW 字串**

在 `src/features/spec-wizard/i18n/dictionaries.ts` zh-TW 區塊內、`"field.openQuestionsPlaceholder"` 之後（約第 123 行）插入：

```ts
    "field.raidId": "編號",
    "field.raidIdHelp": "自動生成；可手動覆寫，例：R-001 / Q-001。",
    "field.raidStatus": "狀態",
    "field.raidStatusHelp": "open=尚未驗證；validating=驗證中；validated=已被證實；invalidated=已被推翻。",
    "raidStatus.open": "open（未驗證）",
    "raidStatus.validating": "validating（驗證中）",
    "raidStatus.validated": "validated（已證實）",
    "raidStatus.invalidated": "invalidated（已推翻）",
    "field.riskMitigation": "緩解措施",
    "field.riskMitigationHelp": "若已有對應的緩解或備案，請說明，便於後續迭代追蹤。",
    "field.riskMitigationPlaceholder": "例：先導流到舊系統作 fallback，等真實資料驗證後再切換。",
```

- [ ] **Step 3: 補 en 字串**

在 `src/features/spec-wizard/i18n/dictionaries.ts` en 區塊內、`"field.openQuestionsPlaceholder"` 之後（約第 384 行）插入：

```ts
    "field.raidId": "ID",
    "field.raidIdHelp": "Auto-generated; you can override, e.g. R-001 / Q-001.",
    "field.raidStatus": "Status",
    "field.raidStatusHelp": "open = not yet validated; validating = under test; validated = confirmed; invalidated = disproven.",
    "raidStatus.open": "open (unvalidated)",
    "raidStatus.validating": "validating (under test)",
    "raidStatus.validated": "validated (confirmed)",
    "raidStatus.invalidated": "invalidated (disproven)",
    "field.riskMitigation": "Mitigation",
    "field.riskMitigationHelp": "If you already have a fallback or workaround, write it here so future iterations can trace it.",
    "field.riskMitigationPlaceholder": "e.g. Fall back to the legacy flow until real-traffic validation passes.",
```

- [ ] **Step 4: 跑型別檢查確認 dictionary 完整**

```bash
npx tsc --noEmit
```

預期：無錯誤（dictionaries 對 zh-TW / en 都覆蓋所有 MessageKey）。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/i18n/messageKeys.ts src/features/spec-wizard/i18n/dictionaries.ts
git commit -m "feat: [spec-wizard] 新增 RAID UI 用 i18n 字串（zh-TW / en）(#4)"
```

---

## Task 6: 建立 `RaidArray` 元件

**Files:**
- Create: `src/features/spec-wizard/components/RaidArray.tsx`
- Create: `src/features/spec-wizard/__tests__/raidArray.test.tsx`

**目的：** 抽出可重用元件，給 risks 與 openQuestions 共用。risks 開啟 mitigation 欄位、questions 關閉。

- [ ] **Step 1: 寫 RaidArray render / 編輯測試（紅）**

新建 `src/features/spec-wizard/__tests__/raidArray.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { I18nProvider } from "../i18n/I18nContext"
import { RaidArray } from "../components/RaidArray"
import type { RaidEntry } from "../model/specTypes"

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider initialLocale="en">{ui}</I18nProvider>)
}

describe("RaidArray", () => {
  it("renders existing entries with text, status and (when allowed) mitigation", () => {
    const entries: RaidEntry[] = [
      { id: "R-001", text: "Token edge case", status: "validating", mitigation: "Refresh quietly" }
    ]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={() => undefined} />
    )

    expect(screen.getByDisplayValue("Token edge case")).toBeInTheDocument()
    expect((screen.getByLabelText("Status R-001") as HTMLSelectElement).value).toBe("validating")
    expect(screen.getByDisplayValue("Refresh quietly")).toBeInTheDocument()
  })

  it("does not render mitigation field when allowMitigation is false", () => {
    const entries: RaidEntry[] = [{ id: "Q-001", text: "Who owns it?", status: "open" }]
    renderWithI18n(
      <RaidArray label="Open Questions" idPrefix="Q" allowMitigation={false} entries={entries} onChange={() => undefined} />
    )

    expect(screen.queryByLabelText(/Mitigation/i)).toBeNull()
  })

  it("emits onChange with updated text when user types", async () => {
    const handleChange = vi.fn()
    const entries: RaidEntry[] = [{ id: "R-001", text: "old", status: "open" }]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={handleChange} />
    )

    await userEvent.clear(screen.getByDisplayValue("old"))
    await userEvent.type(screen.getByLabelText("Risks 1"), "new text")

    expect(handleChange).toHaveBeenLastCalledWith([{ id: "R-001", text: "new text", status: "open" }])
  })

  it("emits onChange with updated status when user selects a new option", async () => {
    const handleChange = vi.fn()
    const entries: RaidEntry[] = [{ id: "R-001", text: "x", status: "open" }]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={handleChange} />
    )

    await userEvent.selectOptions(screen.getByLabelText("Status R-001"), "validated")

    expect(handleChange).toHaveBeenLastCalledWith([{ id: "R-001", text: "x", status: "validated" }])
  })

  it("appends a new entry with auto-generated id when user clicks add", async () => {
    const handleChange = vi.fn()
    const entries: RaidEntry[] = [{ id: "R-001", text: "first", status: "open" }]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={handleChange} />
    )

    await userEvent.click(screen.getByRole("button", { name: /add/i }))

    expect(handleChange).toHaveBeenLastCalledWith([
      { id: "R-001", text: "first", status: "open" },
      { id: "R-002", text: "", status: "open" }
    ])
  })

  it("removes an entry when user clicks the remove button", async () => {
    const handleChange = vi.fn()
    const entries: RaidEntry[] = [
      { id: "R-001", text: "first", status: "open" },
      { id: "R-002", text: "second", status: "open" }
    ]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={handleChange} />
    )

    await userEvent.click(screen.getByRole("button", { name: /remove R-002/i }))

    expect(handleChange).toHaveBeenLastCalledWith([{ id: "R-001", text: "first", status: "open" }])
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/raidArray.test.tsx
```

預期：FAIL，import 錯誤（`RaidArray` 不存在）。

- [ ] **Step 3: 實作 `RaidArray` 元件**

新建 `src/features/spec-wizard/components/RaidArray.tsx`：

```tsx
"use client"

import { useI18n } from "../i18n/I18nContext"
import type { RaidEntry, RaidStatus } from "../model/specTypes"

const STATUS_OPTIONS: RaidStatus[] = ["open", "validating", "validated", "invalidated"]

type RaidArrayProps = {
  label: string
  idPrefix: "R" | "Q"
  allowMitigation: boolean
  help?: string
  helpId?: string
  placeholder?: string
  entries: RaidEntry[]
  onChange: (entries: RaidEntry[]) => void
}

function nextId(prefix: "R" | "Q", entries: RaidEntry[]): string {
  const existingNumbers = entries
    .map((entry) => {
      const match = entry.id.match(/^[RQ]-(\d+)$/)
      return match ? Number.parseInt(match[1], 10) : 0
    })
    .filter((n) => Number.isFinite(n) && n > 0)
  const max = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  return `${prefix}-${String(max + 1).padStart(3, "0")}`
}

export function RaidArray({
  label,
  idPrefix,
  allowMitigation,
  help,
  helpId,
  placeholder,
  entries,
  onChange
}: RaidArrayProps) {
  const { t } = useI18n()

  function patch(index: number, partial: Partial<RaidEntry>) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...partial } : entry)))
  }

  return (
    <div className="field stack">
      <span>{label}</span>
      {help ? <small id={helpId}>{help}</small> : null}
      <div className="stack" aria-describedby={helpId}>
        {entries.map((entry, index) => (
          <div key={entry.id} className="raid-row stack">
            <label className="stack">
              <span>{t("field.raidId")}</span>
              <input type="text" value={entry.id} onChange={(event) => patch(index, { id: event.target.value })} />
            </label>
            <label className="stack">
              <span>{`${label} ${index + 1}`}</span>
              <input
                type="text"
                aria-label={`${label} ${index + 1}`}
                placeholder={placeholder}
                value={entry.text}
                onChange={(event) => patch(index, { text: event.target.value })}
              />
            </label>
            <label className="stack">
              <span>{t("field.raidStatus")}</span>
              <small>{t("field.raidStatusHelp")}</small>
              <select
                aria-label={`Status ${entry.id}`}
                value={entry.status}
                onChange={(event) => patch(index, { status: event.target.value as RaidStatus })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`raidStatus.${status}` as const)}
                  </option>
                ))}
              </select>
            </label>
            {allowMitigation ? (
              <label className="stack">
                <span>{t("field.riskMitigation")}</span>
                <small>{t("field.riskMitigationHelp")}</small>
                <textarea
                  aria-label={`${t("field.riskMitigation")} ${entry.id}`}
                  placeholder={t("field.riskMitigationPlaceholder")}
                  value={entry.mitigation ?? ""}
                  onChange={(event) => {
                    const next = event.target.value
                    patch(index, { mitigation: next.trim() === "" ? undefined : next })
                  }}
                />
              </label>
            ) : null}
            <button
              type="button"
              className="secondary"
              aria-label={`Remove ${entry.id}`}
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
            >
              −
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => onChange([...entries, { id: nextId(idPrefix, entries), text: "", status: "open" }])}
        >
          + {t("wizard.addItem")}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/raidArray.test.tsx
```

預期：所有 6 條測試 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/RaidArray.tsx src/features/spec-wizard/__tests__/raidArray.test.tsx
git commit -m "feat: [spec-wizard] 新增 RaidArray 元件（text + status + 可選 mitigation）(#4)"
```

---

## Task 7: 把 `BoundariesStep` 換成 `RaidArray`

**Files:**
- Modify: `src/features/spec-wizard/components/steps/BoundariesStep.tsx`

- [ ] **Step 1: 替換 risks 與 openQuestions 兩處 `<FieldArray>`**

把 `src/features/spec-wizard/components/steps/BoundariesStep.tsx` Task 2 留下的兩個 wrapper 區塊整段改成：

```tsx
      <RaidArray
        label={t("field.risks")}
        idPrefix="R"
        allowMitigation
        help={t("field.risksHelp")}
        helpId="risks-help"
        placeholder={t("field.risksPlaceholder")}
        entries={draft.agentBoundaries.risks}
        onChange={(risks) =>
          setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, risks } })
        }
      />
      <RaidArray
        label={t("field.openQuestions")}
        idPrefix="Q"
        allowMitigation={false}
        help={t("field.openQuestionsHelp")}
        helpId="open-questions-help"
        placeholder={t("field.openQuestionsPlaceholder")}
        entries={draft.agentBoundaries.openQuestions}
        onChange={(openQuestions) =>
          setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, openQuestions } })
        }
      />
```

並在檔案頂端 import 區塊加上：

```tsx
import { RaidArray } from "../RaidArray"
```

- [ ] **Step 2: 跑型別檢查 + 全部測試**

```bash
npx tsc --noEmit && bunx vitest run
```

預期：全綠。

- [ ] **Step 3: 啟動 dev server，手動驗收 UI**

```bash
bun run dev
```

打開瀏覽器（`http://localhost:3000`），走到「限制與風險」步驟：
- 確認 risks 區塊每個 row 看得到「編號 / 風險文字 / 狀態下拉 / 緩解措施」四欄。
- 確認 openQuestions 區塊每個 row 只有「編號 / 問題文字 / 狀態下拉」三欄（無 mitigation）。
- 編輯一條、切換 status 為 `validated`，到 Review 頁切到 YAML tab 確認輸出含 `qualityWarnings: - id: "R-001" text: ... status: "validated"`。

完成後 Ctrl+C 結束 dev server。

- [ ] **Step 4: Commit**

```bash
git add src/features/spec-wizard/components/steps/BoundariesStep.tsx
git commit -m "feat: [spec-wizard] BoundariesStep 改用 RaidArray 提供 status 編輯能力 (#4)"
```

---

## Task 8: 升級 Seed Prompt schema 範例

**Files:**
- Modify: `src/features/spec-wizard/services/seedPromptBuilder.ts:55-61`

**目的：** 避免外部 LLM 看到舊 `string[]` 範例後又生成過時格式。

- [ ] **Step 1: 修改 prompt 中的 schema 描述**

在 `src/features/spec-wizard/services/seedPromptBuilder.ts` 第 55-61 行 `agentBoundaries` 區塊改成：

```ts
- agentBoundaries: { 
    nonGoals: string[], 
    constraints: string[], 
    testExpectations: string[],
    risks: Array<{ id: string, text: string, status: "open" | "validating" | "validated" | "invalidated", mitigation?: string }>,
    openQuestions: Array<{ id: string, text: string, status: "open" | "validating" | "validated" | "invalidated" }>
  }
```

- [ ] **Step 2: 跑全部測試（assistService 用 prompt 文字判斷時不應誤觸）**

```bash
bunx vitest run
```

預期：全綠。

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/services/seedPromptBuilder.ts
git commit -m "docs: [spec-wizard] Seed Prompt schema 範例升級為結構化 RAID (#4)"
```

---

## Task 9: 標記 Gap Analysis spec 為已實作

**Files:**
- Modify: `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md:119-145`、`245-258`

- [ ] **Step 1: 更新 §4 標題與內文**

把 `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md` 第 119 行：

```markdown
## 4. 假設與風險缺乏可追蹤性（RAID log 不完整）
```

改成：

```markdown
## 4. 假設與風險缺乏可追蹤性（RAID log 不完整）✅ 已實作 (2026-04-29)
```

接著把第 121-145 行整個 §4 內文（從「### 現況」到 §5 之前）替換為：

```markdown
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
```

- [ ] **Step 2: 更新 §10 表格狀態欄與結語**

把 `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md` 第 251 行：

```markdown
| 3 | #4 RAID 結構（id + status） | schema + 簡單 UI | 中 | ⬜ 未開始 |
```

改成：

```markdown
| 3 | #4 RAID 結構（id + status） | schema + 簡單 UI | 中 | ✅ 已實作 (2026-04-29) |
```

並把第 258 行的尾段：

```markdown
第 1 + 第 2 是「最划算的兩刀」：…… 下一個建議啟動的高 CP 值項目為 **#4 RAID 結構**（風險與假設可追蹤性）。
```

改成：

```markdown
第 1 + 第 2 是「最划算的兩刀」：打通 Pipeline B → wizard 的優先序鏈，並讓 PO 看見 INVEST 落差，但仍維持 wizard「驗證刻意鬆」的設計約束——兩項皆已於 2026-04-29 前完成，未破壞既有測試與 draft 相容性（`schemaVersion` 已升至 `0.2`）。RAID 結構（#4）亦於 2026-04-29 完成升級，敏捷品質三件套（INVEST / successSignals / RAID）齊備。下一個建議啟動的項目為 **#6 CLI import 子命令**（解決 Pipeline B 銜接最後一哩）。
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md
git commit -m "docs: [gap-analysis] 標記 #4 RAID 結構為已實作 (2026-04-29)"
```

---

## 驗收清單（Self-Review)

完成所有 task 後，逐項打勾：

- [ ] `bunx vitest run` 全綠（含 draftStorage / yamlSerializer / raidArray / schemas 測試）
- [ ] `npx tsc --noEmit` 無錯誤
- [ ] `bun run dev` 開瀏覽器手動驗收：BoundariesStep 出現 RaidArray、status 下拉可切換、risks 有 mitigation textarea、openQuestions 沒有
- [ ] Review 頁 YAML tab 顯示 `qualityWarnings` 與 `openQuestions` 為物件陣列、blank mitigation 自動省略
- [ ] 拿一份舊版 draft JSON（risks/openQuestions 是字串）匯入 Draft Manager，確認自動遷移成 RaidEntry 且不丟資料
- [ ] `docs/methodology/reference-case/04-handoff/*.feature-seed.json` 兩份檔案不必改動，sweep 測試仍通過
- [ ] gap-analysis spec §4 與 §10 已標記
- [ ] 9 個 commit 訊息符合 `feat:` / `refactor:` / `docs:` 前綴規範
