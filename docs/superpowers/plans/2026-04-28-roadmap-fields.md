# Roadmap 欄位實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 `FeatureDraft.metadata` 加入四個選填的 roadmap 欄位（`id` / `horizon` / `priority` / `dependsOn`），讓 Pipeline B 在 Slice 階段排出的優先級可一路流到 wizard 與最終 YAML，不在 Handoff 之間遺失；同步把 `feature-seed.schema.json` 升級以承接這些欄位。

**Architecture:** 四個欄位全部選填、加在 `metadata` 底下。`schemaVersion` 顯式升 `0.2`。`yamlSerializer.normalizeDraftForExport` 對未設值的欄位採「條件 spread」省略輸出（不污染舊 draft 的 YAML）。`normalizeDraft`（draft 載入路徑）對舊 draft 自動補 `undefined`，向後相容。UI 在 `BasicStep` 加三個下拉與一個 input；`ReviewPanel` 加 Roadmap 區塊。Pipeline B 的 Handoff 階段在文件中說明欄位映射。

**Tech Stack:** TypeScript（嚴格 nullable）、Next.js 15 App Router、React 19、Vitest（jsdom）、Bun、JSON Schema draft-07。

---

## File Structure

| 檔案 | 變更類型 | 責任 |
|------|---------|------|
| `src/features/spec-wizard/model/specTypes.ts` | Modify | 新增 `Horizon` / `Priority` 型別、`FeatureDraft.metadata` 加 4 個選填欄位 |
| `src/features/spec-wizard/model/defaultDraft.ts` | Modify | 空 draft 不預設 roadmap 欄位（保持 undefined） |
| `src/features/spec-wizard/services/yamlSerializer.ts` | Modify | `schemaVersion` 升 `0.2`，條件 spread 輸出 4 個欄位 |
| `src/features/spec-wizard/persistence/draftStorage.ts` | Modify | `normalizeDraft` 對舊 draft 自動補 undefined |
| `src/features/spec-wizard/i18n/messageKeys.ts` | Modify | 新增 21 個 MessageKey union 成員 |
| `src/features/spec-wizard/i18n/dictionaries.ts` | Modify | zh-TW / en 各補對應字串 |
| `src/features/spec-wizard/components/steps/BasicStep.tsx` | Modify | 在 metadata 區段下方加 Roadmap 4 個輸入 |
| `src/features/spec-wizard/components/ReviewPanel.tsx` | Modify | 在 summary 視圖加 Roadmap 區塊 |
| `src/features/spec-wizard/test/fixtures.ts` | Modify | 補 `draftWithRoadmap()` 工廠（給新測試用） |
| `src/features/spec-wizard/__tests__/yamlSerializer.test.ts` | Modify | 補 schemaVersion / roadmap 條件輸出測試 |
| `src/features/spec-wizard/__tests__/draftStorage.test.ts` | Modify | 補舊 draft 載入時 roadmap 欄位為 undefined 的測試 |
| `src/features/spec-wizard/__tests__/reviewPanel.test.tsx` | Modify | 補 ReviewPanel 顯示 Roadmap 區塊的測試 |
| `src/features/spec-wizard/__tests__/wizardFlow.test.tsx` | Modify | 補 BasicStep Roadmap 互動測試 |
| `docs/methodology/schemas/feature-seed.schema.json` | Modify | `schemaVersion` 升 `0.2`，metadata 加 4 個選填欄位 |
| `docs/methodology/pipeline-b.md` | Modify | Handoff 章節加 `feature-candidates → feature-seed` 欄位映射 |
| `AGENTS.md` | Modify | invariant 章節更新 `schemaVersion` 至 `0.2` |

---

## Task 1: 加入 Roadmap 型別並升版 schemaVersion

**Files:**
- Modify: `src/features/spec-wizard/model/specTypes.ts:51-56`
- Modify: `src/features/spec-wizard/services/yamlSerializer.ts:53`
- Modify: `src/features/spec-wizard/__tests__/yamlSerializer.test.ts:10`

- [ ] **Step 1: 改寫既有的 schemaVersion 測試（紅）**

把 `src/features/spec-wizard/__tests__/yamlSerializer.test.ts` 第 10 行的 `'schemaVersion: "0.1"'` 改成：

```ts
expect(yaml).toContain('schemaVersion: "0.2"')
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts -t "serializes the required top-level YAML sections"
```

預期：FAIL，輸出包含 `schemaVersion: "0.1"` 但測試斷言 `"0.2"`。

- [ ] **Step 3: 在 specTypes.ts 新增型別並擴充 metadata**

把 `src/features/spec-wizard/model/specTypes.ts` 第 51–56 行的 `FeatureDraft.metadata` 改成：

```ts
export type Horizon = "now" | "next" | "later"

export type Priority = "must" | "should" | "could" | "wont"

export type FeatureDraft = {
  metadata: {
    title: string
    owner?: string
    locale: Locale
    id?: string
    horizon?: Horizon
    priority?: Priority
    dependsOn?: string[]
  }
  // ...其餘欄位 summary/goal/impacts/deliverables/userActivities/epics/agentBoundaries 完全不動
```

注意：`Horizon` 與 `Priority` 兩個型別 export 出去（後續 `BasicStep` / `ReviewPanel` / `dictionaries` 不需要直接 import，但對外暴露方便日後擴展）。

- [ ] **Step 4: 在 yamlSerializer.ts 升 schemaVersion**

把 `src/features/spec-wizard/services/yamlSerializer.ts` 第 53 行：

```ts
schemaVersion: "0.1",
```

改成：

```ts
schemaVersion: "0.2",
```

- [ ] **Step 5: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts
```

預期：所有既有測試 PASS（型別新增是非破壞性，序列化也僅版本字串改動）。

- [ ] **Step 6: 跑型別檢查**

```bash
npx tsc --noEmit
```

預期：無錯誤。新欄位都是選填，既有 `createEmptyDraft` 與所有 fixture 不需要立即更新。

- [ ] **Step 7: Commit**

```bash
git add src/features/spec-wizard/model/specTypes.ts \
        src/features/spec-wizard/services/yamlSerializer.ts \
        src/features/spec-wizard/__tests__/yamlSerializer.test.ts
git commit -m "feat: [spec-wizard] 加入 Horizon/Priority 型別並升 schemaVersion 至 0.2"
```

---

## Task 2: 序列化器條件輸出 metadata.id

**Files:**
- Modify: `src/features/spec-wizard/services/yamlSerializer.ts:54-60`
- Modify: `src/features/spec-wizard/__tests__/yamlSerializer.test.ts`
- Modify: `src/features/spec-wizard/test/fixtures.ts`

- [ ] **Step 1: 在 fixtures.ts 補 draftWithRoadmap 工廠**

在 `src/features/spec-wizard/test/fixtures.ts` 檔案末尾新增（保留既有 `minimalValidDraft`）：

```ts
export function draftWithRoadmap(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.metadata.id = "FT-001"
  draft.metadata.horizon = "now"
  draft.metadata.priority = "must"
  draft.metadata.dependsOn = ["FT-002", "FT-005"]
  return draft
}
```

- [ ] **Step 2: 寫失敗測試（紅） — id 條件輸出**

在 `src/features/spec-wizard/__tests__/yamlSerializer.test.ts` 的 `describe("yamlSerializer", ...)` 區塊內追加，並把檔頭的 import 從 `import { minimalValidDraft } from "../test/fixtures"` 改成 `import { draftWithRoadmap, minimalValidDraft } from "../test/fixtures"`：

```ts
it("emits metadata.id only when set", () => {
  const withId = draftWithRoadmap()
  const withoutId = minimalValidDraft()

  const yamlWith = draftToYaml(withId, "2026-04-28")
  const yamlWithout = draftToYaml(withoutId, "2026-04-28")

  expect(yamlWith).toContain('id: "FT-001"')
  expect(yamlWithout).not.toContain("id:")
})
```

- [ ] **Step 3: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts -t "emits metadata.id only when set"
```

預期：FAIL，輸出沒有 `id:` 欄位。

- [ ] **Step 4: 修改 normalizeDraftForExport 條件輸出 id**

把 `src/features/spec-wizard/services/yamlSerializer.ts` 的 `metadata` 區塊（第 54–60 行）改成：

```ts
metadata: {
  title: cleanString(draft.metadata.title),
  owner: cleanString(draft.metadata.owner),
  locale: draft.metadata.locale,
  ...(draft.metadata.id ? { id: draft.metadata.id } : {}),
  createdAt,
  status: "draft"
},
```

- [ ] **Step 5: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts
```

預期：全部 PASS。`not.toContain("id:")` 在 `withoutId` 那份 yaml 通過，因為條件 spread 完全省略該欄位。

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/services/yamlSerializer.ts \
        src/features/spec-wizard/__tests__/yamlSerializer.test.ts \
        src/features/spec-wizard/test/fixtures.ts
git commit -m "feat: [spec-wizard] yamlSerializer 條件輸出 metadata.id"
```

---

## Task 3: 序列化器條件輸出 horizon / priority / dependsOn

**Files:**
- Modify: `src/features/spec-wizard/services/yamlSerializer.ts`（`metadata` 區塊）
- Modify: `src/features/spec-wizard/__tests__/yamlSerializer.test.ts`

- [ ] **Step 1: 寫失敗測試（紅） — 三欄條件輸出**

在 `__tests__/yamlSerializer.test.ts` 的 `describe("yamlSerializer", ...)` 內追加：

```ts
it("emits metadata.horizon only when set", () => {
  const withRoadmap = draftWithRoadmap()
  const withoutRoadmap = minimalValidDraft()

  expect(draftToYaml(withRoadmap, "2026-04-28")).toContain('horizon: "now"')
  expect(draftToYaml(withoutRoadmap, "2026-04-28")).not.toContain("horizon:")
})

it("emits metadata.priority only when set", () => {
  const withRoadmap = draftWithRoadmap()
  const withoutRoadmap = minimalValidDraft()

  expect(draftToYaml(withRoadmap, "2026-04-28")).toContain('priority: "must"')
  expect(draftToYaml(withoutRoadmap, "2026-04-28")).not.toContain("priority:")
})

it("emits metadata.dependsOn only when non-empty", () => {
  const withRoadmap = draftWithRoadmap()
  const withoutRoadmap = minimalValidDraft()
  const withEmptyArray = minimalValidDraft()
  withEmptyArray.metadata.dependsOn = []

  const yamlWith = draftToYaml(withRoadmap, "2026-04-28")
  expect(yamlWith).toContain("dependsOn:")
  expect(yamlWith).toContain('- "FT-002"')
  expect(yamlWith).toContain('- "FT-005"')

  expect(draftToYaml(withoutRoadmap, "2026-04-28")).not.toContain("dependsOn:")
  expect(draftToYaml(withEmptyArray, "2026-04-28")).not.toContain("dependsOn:")
})
```

- [ ] **Step 2: 跑測試確認三條全失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts
```

預期：三條新測試 FAIL，舊測試仍 PASS。

- [ ] **Step 3: 擴充 normalizeDraftForExport 的 metadata 區塊**

把 `src/features/spec-wizard/services/yamlSerializer.ts` 的 metadata 區塊改成：

```ts
metadata: {
  title: cleanString(draft.metadata.title),
  owner: cleanString(draft.metadata.owner),
  locale: draft.metadata.locale,
  ...(draft.metadata.id ? { id: draft.metadata.id } : {}),
  ...(draft.metadata.horizon ? { horizon: draft.metadata.horizon } : {}),
  ...(draft.metadata.priority ? { priority: draft.metadata.priority } : {}),
  ...(draft.metadata.dependsOn && draft.metadata.dependsOn.length > 0
    ? { dependsOn: draft.metadata.dependsOn }
    : {}),
  createdAt,
  status: "draft"
},
```

- [ ] **Step 4: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts
```

預期：所有測試 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/yamlSerializer.ts \
        src/features/spec-wizard/__tests__/yamlSerializer.test.ts
git commit -m "feat: [spec-wizard] yamlSerializer 條件輸出 horizon/priority/dependsOn"
```

---

## Task 4: 載入舊 draft 時 roadmap 欄位保持 undefined

**Files:**
- Modify: `src/features/spec-wizard/persistence/draftStorage.ts:32-81`
- Modify: `src/features/spec-wizard/__tests__/draftStorage.test.ts`

- [ ] **Step 1: 寫失敗測試（紅） — 舊 draft 反序列化**

在 `src/features/spec-wizard/__tests__/draftStorage.test.ts` 的 describe block 末尾追加（若尚無 `draftFromJson` import 則加上）：

```ts
import { draftFromJson } from "../persistence/draftStorage"

it("loads legacy draft (no roadmap fields) and leaves them undefined", () => {
  const legacyJson = JSON.stringify({
    metadata: { title: "Legacy", locale: "en" },
    summary: {},
    goal: { statement: "x", successSignals: [] },
    impacts: [],
    deliverables: [],
    userActivities: [],
    epics: [{
      id: "EP-001", title: "e",
      stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
    }],
    agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
  })

  const draft = draftFromJson(legacyJson)

  expect(draft.metadata.title).toBe("Legacy")
  expect(draft.metadata.id).toBeUndefined()
  expect(draft.metadata.horizon).toBeUndefined()
  expect(draft.metadata.priority).toBeUndefined()
  expect(draft.metadata.dependsOn).toBeUndefined()
})

it("preserves roadmap fields when present in JSON", () => {
  const json = JSON.stringify({
    metadata: {
      title: "New", locale: "en",
      id: "FT-001", horizon: "next", priority: "should", dependsOn: ["FT-000"]
    },
    summary: {},
    goal: { statement: "x", successSignals: [] },
    impacts: [],
    deliverables: [],
    userActivities: [],
    epics: [{
      id: "EP-001", title: "e",
      stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
    }],
    agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
  })

  const draft = draftFromJson(json)

  expect(draft.metadata.id).toBe("FT-001")
  expect(draft.metadata.horizon).toBe("next")
  expect(draft.metadata.priority).toBe("should")
  expect(draft.metadata.dependsOn).toEqual(["FT-000"])
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/draftStorage.test.ts
```

預期：第二個測試 FAIL（`...draft.metadata` spread 雖會帶過來，但若該檔案的 `normalizeDraft` 對 metadata 結構有顯式 pick，roadmap 欄位會被丟掉）。第一個測試很可能 PASS（缺欄位剛好就是 undefined），但確認第二個 FAIL 即可進行修補。

- [ ] **Step 3: 修改 normalizeDraft 保留 metadata roadmap 欄位**

把 `src/features/spec-wizard/persistence/draftStorage.ts` 第 35–38 行（metadata 區塊）改成：

```ts
metadata: {
  owner: "",
  ...draft.metadata,
  ...(draft.metadata?.id ? { id: draft.metadata.id } : {}),
  ...(draft.metadata?.horizon ? { horizon: draft.metadata.horizon } : {}),
  ...(draft.metadata?.priority ? { priority: draft.metadata.priority } : {}),
  ...(Array.isArray(draft.metadata?.dependsOn) ? { dependsOn: draft.metadata.dependsOn } : {})
},
```

說明：`...draft.metadata` 已會把所有欄位 spread 進來，conditional spread 是為了讓「明確 undefined」與「明確 null」都能被乾淨剔除，不留 `key: null`。

- [ ] **Step 4: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/draftStorage.test.ts
```

預期：所有 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStorage.ts \
        src/features/spec-wizard/__tests__/draftStorage.test.ts
git commit -m "feat: [spec-wizard] normalizeDraft 保留 metadata roadmap 欄位且向後相容舊 draft"
```

---

## Task 5: i18n MessageKey 與字典擴充

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`

- [ ] **Step 1: 在 messageKeys.ts 加入 21 個 MessageKey**

在 `src/features/spec-wizard/i18n/messageKeys.ts` 的 union 末尾（最後一個 `"autosave.dismiss"` 之後）新增：

```ts
  | "field.featureId"
  | "field.featureIdHelp"
  | "field.featureIdPlaceholder"
  | "field.horizon"
  | "field.horizonHelp"
  | "field.priority"
  | "field.priorityHelp"
  | "field.dependsOn"
  | "field.dependsOnHelp"
  | "field.dependsOnPlaceholder"
  | "step.roadmap"
  | "review.roadmap"
  | "horizon.now"
  | "horizon.next"
  | "horizon.later"
  | "horizon.unset"
  | "priority.must"
  | "priority.should"
  | "priority.could"
  | "priority.wont"
  | "priority.unset"
```

- [ ] **Step 2: 在 dictionaries.ts 補 zh-TW 對應字串**

在 `src/features/spec-wizard/i18n/dictionaries.ts` 的 `"zh-TW"` 物件末尾（在 `"autosave.dismiss"` 條目之後、`}` 之前）追加：

```ts
    "field.featureId": "Feature ID（選填，與 Pipeline B 對應）",
    "field.featureIdHelp": "若這份 draft 是從 Pipeline B 的 feature-candidates 帶過來，填同一個 FT-XXX 編號可保留追溯。",
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
    "priority.unset": "未設定",
```

- [ ] **Step 3: 在 dictionaries.ts 補 en 對應字串**

在同檔的 `"en"` 物件末尾追加：

```ts
    "field.featureId": "Feature ID (optional, links to Pipeline B)",
    "field.featureIdHelp": "If this draft was seeded from Pipeline B feature-candidates, use the same FT-XXX id to keep traceability.",
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
    "priority.unset": "Not set",
```

- [ ] **Step 4: 跑型別檢查**

```bash
npx tsc --noEmit
```

預期：無錯誤。`Record<MessageKey, string>` 會強制兩個 locale 都有完整 key，缺漏會編譯失敗。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/i18n/messageKeys.ts \
        src/features/spec-wizard/i18n/dictionaries.ts
git commit -m "feat: [spec-wizard] i18n 加入 roadmap 欄位字串（zh-TW/en）"
```

---

## Task 6: BasicStep 加入 Roadmap 輸入區塊

**Files:**
- Modify: `src/features/spec-wizard/components/steps/BasicStep.tsx`
- Modify: `src/features/spec-wizard/__tests__/wizardFlow.test.tsx`

- [ ] **Step 1: 確認 I18nProvider / Wizard 測試慣用 import**

```bash
grep -n "I18nProvider\|useI18n" src/features/spec-wizard/i18n/I18nContext.tsx | head -5
grep -n "from \"@testing-library" src/features/spec-wizard/__tests__/wizardFlow.test.tsx | head -5
```

預期：取得真實的 Provider 名稱。下方測試碼若 Provider 名稱不同，請以實際匯出名取代 `I18nProvider`。

- [ ] **Step 2: 寫失敗測試（紅） — BasicStep 渲染 Roadmap 欄位**

在 `src/features/spec-wizard/__tests__/wizardFlow.test.tsx` 末尾追加：

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BasicStep } from "../components/steps/BasicStep"
import { I18nProvider } from "../i18n/I18nContext"
import { minimalValidDraft } from "../test/fixtures"

describe("BasicStep roadmap fields", () => {
  it("renders id / horizon / priority / dependsOn inputs", () => {
    const setDraft = vi.fn()
    render(
      <I18nProvider initialLocale="en">
        <BasicStep draft={minimalValidDraft()} setDraft={setDraft} />
      </I18nProvider>
    )

    expect(screen.getByLabelText(/Feature ID/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Roadmap horizon/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/MoSCoW priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Depends on/i)).toBeInTheDocument()
  })

  it("updates metadata.dependsOn from comma-separated input", async () => {
    const user = userEvent.setup()
    let captured = minimalValidDraft()
    const setDraft = (next: typeof captured) => { captured = next }

    render(
      <I18nProvider initialLocale="en">
        <BasicStep draft={captured} setDraft={setDraft} />
      </I18nProvider>
    )

    await user.type(screen.getByLabelText(/Depends on/i), "FT-002, FT-005")
    expect(captured.metadata.dependsOn).toEqual(["FT-002", "FT-005"])
  })
})
```

- [ ] **Step 3: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/wizardFlow.test.tsx -t "BasicStep roadmap fields"
```

預期：FAIL，找不到對應 label。

- [ ] **Step 4: 在 BasicStep.tsx 加入 Roadmap 區塊**

把 `src/features/spec-wizard/components/steps/BasicStep.tsx` 中 owner field 與 `<SeedPromptSection />` 之間（約第 37–39 行之間）插入：

```tsx
      <fieldset
        className="field-group"
        style={{
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "12px 16px",
          margin: "16px 0"
        }}
      >
        <legend>{t("step.roadmap")}</legend>

        <div className="field">
          <label htmlFor="featureId">{t("field.featureId")}</label>
          <small id="featureId-help">{t("field.featureIdHelp")}</small>
          <input
            id="featureId"
            aria-describedby="featureId-help"
            placeholder={t("field.featureIdPlaceholder")}
            value={draft.metadata.id ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  id: event.target.value.trim() || undefined
                }
              })
            }
          />
        </div>

        <div className="field">
          <label htmlFor="horizon">{t("field.horizon")}</label>
          <small id="horizon-help">{t("field.horizonHelp")}</small>
          <select
            id="horizon"
            aria-describedby="horizon-help"
            value={draft.metadata.horizon ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  horizon: (event.target.value || undefined) as typeof draft.metadata.horizon
                }
              })
            }
          >
            <option value="">{t("horizon.unset")}</option>
            <option value="now">{t("horizon.now")}</option>
            <option value="next">{t("horizon.next")}</option>
            <option value="later">{t("horizon.later")}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="priority">{t("field.priority")}</label>
          <small id="priority-help">{t("field.priorityHelp")}</small>
          <select
            id="priority"
            aria-describedby="priority-help"
            value={draft.metadata.priority ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  priority: (event.target.value || undefined) as typeof draft.metadata.priority
                }
              })
            }
          >
            <option value="">{t("priority.unset")}</option>
            <option value="must">{t("priority.must")}</option>
            <option value="should">{t("priority.should")}</option>
            <option value="could">{t("priority.could")}</option>
            <option value="wont">{t("priority.wont")}</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="dependsOn">{t("field.dependsOn")}</label>
          <small id="dependsOn-help">{t("field.dependsOnHelp")}</small>
          <input
            id="dependsOn"
            aria-describedby="dependsOn-help"
            placeholder={t("field.dependsOnPlaceholder")}
            value={(draft.metadata.dependsOn ?? []).join(", ")}
            onChange={(event) => {
              const list = event.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
              setDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  dependsOn: list.length > 0 ? list : undefined
                }
              })
            }}
          />
        </div>
      </fieldset>
```

- [ ] **Step 5: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/wizardFlow.test.tsx
```

預期：新測試 PASS、原有測試不受影響。

- [ ] **Step 6: 在瀏覽器手動驗證**

```bash
bun run dev
```

開 `http://localhost:3000`，建立新 draft，確認 BasicStep 顯示「Roadmap」fieldset，四個欄位皆可輸入；切換 locale 至 zh-TW，確認字串正確。完成後 Ctrl+C 停 dev server。

- [ ] **Step 7: Commit**

```bash
git add src/features/spec-wizard/components/steps/BasicStep.tsx \
        src/features/spec-wizard/__tests__/wizardFlow.test.tsx
git commit -m "feat: [spec-wizard] BasicStep 加入 Roadmap 欄位 UI"
```

---

## Task 7: ReviewPanel 加入 Roadmap 顯示區塊

**Files:**
- Modify: `src/features/spec-wizard/components/ReviewPanel.tsx:155-170`
- Modify: `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`

- [ ] **Step 1: 寫失敗測試（紅） — ReviewPanel 顯示 Roadmap**

在 `src/features/spec-wizard/__tests__/reviewPanel.test.tsx` 末尾追加（若 import 已存在則合併）：

```tsx
import { draftWithRoadmap, minimalValidDraft } from "../test/fixtures"

describe("ReviewPanel roadmap section", () => {
  it("renders roadmap labels and values when fields are set", () => {
    render(
      <I18nProvider initialLocale="en">
        <ReviewPanel draft={draftWithRoadmap()} />
      </I18nProvider>
    )

    expect(screen.getByText(/Roadmap position/i)).toBeInTheDocument()
    expect(screen.getByText("FT-001")).toBeInTheDocument()
    expect(screen.getByText(/Now/)).toBeInTheDocument()
    expect(screen.getByText(/Must/)).toBeInTheDocument()
    expect(screen.getByText(/FT-002/)).toBeInTheDocument()
    expect(screen.getByText(/FT-005/)).toBeInTheDocument()
  })

  it("does not render roadmap section when no fields are set", () => {
    render(
      <I18nProvider initialLocale="en">
        <ReviewPanel draft={minimalValidDraft()} />
      </I18nProvider>
    )

    expect(screen.queryByText(/Roadmap position/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "ReviewPanel roadmap section"
```

預期：FAIL，找不到 Roadmap 文字。

- [ ] **Step 3: 在 ReviewPanel.tsx 的 summary 視圖加入 Roadmap section**

把 `src/features/spec-wizard/components/ReviewPanel.tsx` 第 156 行附近的 `<section><h2>Problem</h2>...` 之前插入：

```tsx
            {(draft.metadata.id ||
              draft.metadata.horizon ||
              draft.metadata.priority ||
              (draft.metadata.dependsOn?.length ?? 0) > 0) && (
              <section>
                <h2>{t("review.roadmap")}</h2>
                <ul>
                  {draft.metadata.id && (
                    <li>
                      ID: <strong>{draft.metadata.id}</strong>
                    </li>
                  )}
                  {draft.metadata.horizon && (
                    <li>
                      {t("field.horizon")}:{" "}
                      <strong>{t(`horizon.${draft.metadata.horizon}` as const)}</strong>
                    </li>
                  )}
                  {draft.metadata.priority && (
                    <li>
                      {t("field.priority")}:{" "}
                      <strong>{t(`priority.${draft.metadata.priority}` as const)}</strong>
                    </li>
                  )}
                  {(draft.metadata.dependsOn?.length ?? 0) > 0 && (
                    <li>
                      {t("field.dependsOn")}:{" "}
                      <strong>{draft.metadata.dependsOn!.join(", ")}</strong>
                    </li>
                  )}
                </ul>
              </section>
            )}
```

- [ ] **Step 4: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx
```

預期：所有測試 PASS。

- [ ] **Step 5: 跑全套測試**

```bash
bun run test
```

預期：所有測試 PASS。任何失敗都應修正——不要繼續往下做。

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/components/ReviewPanel.tsx \
        src/features/spec-wizard/__tests__/reviewPanel.test.tsx
git commit -m "feat: [spec-wizard] ReviewPanel 在 summary 視圖顯示 Roadmap 位置"
```

---

## Task 8: feature-seed.schema.json 升版並加入 4 個選填欄位

**Files:**
- Modify: `docs/methodology/schemas/feature-seed.schema.json`

- [ ] **Step 1: 把 schemaVersion 的 const 升到 0.2**

把 `docs/methodology/schemas/feature-seed.schema.json` 第 20 行：

```json
"schemaVersion": { "type": "string", "const": "0.1" },
```

改成：

```json
"schemaVersion": { "type": "string", "const": "0.2" },
```

- [ ] **Step 2: 在 metadata 加入 4 個選填欄位**

把同檔第 21–30 行的 `metadata` 區塊改成：

```json
    "metadata": {
      "type": "object",
      "required": ["title", "locale"],
      "additionalProperties": false,
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "owner": { "type": "string" },
        "locale": { "type": "string", "enum": ["zh-TW", "en"] },
        "id": { "type": "string", "pattern": "^FT-\\d{3}$" },
        "horizon": { "type": "string", "enum": ["now", "next", "later"] },
        "priority": { "type": "string", "enum": ["must", "should", "could", "wont"] },
        "dependsOn": {
          "type": "array",
          "items": { "type": "string", "pattern": "^FT-\\d{3}$" }
        }
      }
    },
```

注意：四個新欄位都不在 `required` 陣列，維持選填。

- [ ] **Step 3: 用 ajv 驗證 schema 仍合法（如有 ajv-cli 則直接用，否則跳過此步）**

```bash
command -v ajv >/dev/null 2>&1 && ajv compile -s docs/methodology/schemas/feature-seed.schema.json || echo "ajv-cli 不存在，跳過 schema lint"
```

預期：若 ajv 可用，輸出 `valid`；否則跳過。

- [ ] **Step 4: Commit**

```bash
git add docs/methodology/schemas/feature-seed.schema.json
git commit -m "feat: [methodology] feature-seed schema 升至 0.2 並加入 metadata roadmap 欄位"
```

---

## Task 9: pipeline-b.md 補 Handoff 階段欄位映射

**Files:**
- Modify: `docs/methodology/pipeline-b.md`（「階段間如何銜接」章節 + 「進入下一步：Vector wizard」章節）

- [ ] **Step 1: 在「階段間如何銜接」段落末尾追加映射說明**

把 `docs/methodology/pipeline-b.md` 中以「整條 pipeline 不會主動「補全」這些開放問題，而是讓它們可被追蹤。」結尾的那段之後新增：

```markdown

從 v0.2 起，Slice 階段在 `feature-candidates.json` 排出的 `priority`、`dependsOn` 與 feature `id`，會在 Handoff 階段一併寫入每份 `feature-seed.json` 的 `metadata` 區塊：

| feature-candidates 欄位 | feature-seed.metadata 對應欄位 | 說明 |
|------------------------|-------------------------------|------|
| `id` (FT-XXX) | `id` | 保留追溯，wizard 內可顯示與編輯 |
| `priority` (must/should/could/wont) | `priority` | MoSCoW 優先級原樣帶下游 |
| `dependsOn` (FT-XXX 陣列) | `dependsOn` | 依賴關係原樣帶下游 |
| _（Slice 階段新判斷）_ | `horizon` (now/next/later) | 由執行者在 Slice 結尾或 Handoff 開始時依 priority 決定預設值；`must→now`、`should→next`、其他→`later` 可作為起始建議，但不強制。 |

這四個欄位在 wizard 是選填的，未填時 YAML 會省略對應 key。Pipeline B 跑完之後若這幾個值都沒填，wizard 仍可正常運作，只是失去跨 feature 的排序資訊。
```

- [ ] **Step 2: 在「進入下一步：Vector wizard」段落把 step list 改成 5 步**

把該段原本：

```markdown
1. 在專案目錄執行 `npx vector-wizard` 啟動本地 wizard。
2. 開啟 Draft Manager，選擇「貼上 JSON」匯入 feature-seed，每份 JSON 對應一個 `FeatureDraft`。
3. 在 wizard 內補完 acceptance criteria、examples，並逐一確認 `openQuestions` 與假設。
4. 透過 wizard 的 Generate Spec 匯出最終 YAML，交給後續 AI coding agent。
```

改成：

```markdown
1. 在專案目錄執行 `npx vector-wizard` 啟動本地 wizard。
2. 開啟 Draft Manager，選擇「貼上 JSON」匯入 feature-seed，每份 JSON 對應一個 `FeatureDraft`。
3. 在 wizard 內補完 acceptance criteria、examples，並逐一確認 `openQuestions` 與假設。
4. 確認 BasicStep 的「Roadmap」區塊：若這份 draft 由 Pipeline B 產生，`id`、`priority`、`dependsOn` 應已預填；可視需要調整 `horizon`，或補上 Slice 階段未決定的欄位。
5. 透過 wizard 的 Generate Spec 匯出最終 YAML，交給後續 AI coding agent。
```

- [ ] **Step 3: 確認 markdown 結構未壞**

```bash
command -v glow >/dev/null 2>&1 && glow docs/methodology/pipeline-b.md | head -120 || echo "glow 不存在，請肉眼檢查 docs/methodology/pipeline-b.md"
```

預期：表格、標題層級、列表結構完整。

- [ ] **Step 4: Commit**

```bash
git add docs/methodology/pipeline-b.md
git commit -m "docs: [methodology] pipeline-b 補 Handoff 階段 roadmap 欄位映射"
```

---

## Task 10: AGENTS.md invariant 章節更新 schemaVersion

**Files:**
- Modify: `AGENTS.md`（Invariants 章節）

- [ ] **Step 1: 把 invariant 字串中的 0.1 改成 0.2**

把 `AGENTS.md` 中：

```
- **`schemaVersion` is `"0.1"`** in the exported YAML; bump explicitly if you change the YAML shape.
```

改成：

```
- **`schemaVersion` is `"0.2"`** in the exported YAML（自 2026-04-28 起，新增 `metadata.{id,horizon,priority,dependsOn}` 四個選填欄位）；bump explicitly if you change the YAML shape.
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: [agents] 更新 schemaVersion invariant 至 0.2"
```

---

## Task 11: 全套驗證與最終 sanity check

**Files:** 不動原始碼，只跑驗證指令。

- [ ] **Step 1: 跑全套 lint + test + build**

依序執行（前一條失敗就停下修正）：

```bash
bun run lint
bun run test
bun run build
```

預期：三條皆通過。`bun run build` 包含 `tsc --noEmit`，會把任何遺漏的型別錯誤抓出來。

- [ ] **Step 2: 手動測試完整流程**

```bash
bun run dev
```

依序在瀏覽器（`http://localhost:3000`）操作：

1. 建立新 draft，填 title「測試 Roadmap」
2. BasicStep → Roadmap fieldset 填 `FT-099` / `now` / `must` / `FT-001, FT-002`
3. 跳到 Review → Summary 視圖，確認 Roadmap position 區塊正確顯示四項
4. 切到 YAML 視圖，確認：
   - `schemaVersion: "0.2"`
   - `metadata.id: "FT-099"`
   - `metadata.horizon: "now"`
   - `metadata.priority: "must"`
   - `metadata.dependsOn` 陣列含 `FT-001`、`FT-002`
5. 下載 YAML，重新整理頁面，確認 draft 仍存在
6. 建立第二份 draft，**不填**任何 Roadmap 欄位，匯出 YAML，確認 metadata 區段「不包含」上述四個 key

完成後 Ctrl+C 停 dev server。

- [ ] **Step 3: 確認 git tree 乾淨**

```bash
git status
```

預期：`nothing to commit, working tree clean`（所有檔案都已 commit）。

- [ ] **Step 4: 列出本次 plan 產出的所有 commit**

```bash
git log --oneline -10
```

預期看到 10 條本計劃的 commit（Task 1–10 各一條）。

---

## Self-Review Checklist

- ✅ **Spec coverage**：gap analysis 第 1 項提到的三件事——Wizard 加欄位、yamlSerializer 對應、`feature-seed.schema.json` 同步擴充——分別由 Task 1+2+3+6、Task 1+2+3、Task 8 涵蓋。Pipeline B 文件對應 Task 9。`schemaVersion` 升 0.2 由 Task 1 + Task 8 + Task 10 分頭執行。
- ✅ **Placeholder scan**：每個步驟都有具體程式碼或具體指令，無 TBD / TODO / 「類似 Task N」字樣。
- ✅ **Type consistency**：`Horizon = "now" | "next" | "later"` 與 `Priority = "must" | "should" | "could" | "wont"` 在 specTypes、yamlSerializer、BasicStep、ReviewPanel、dictionaries、feature-seed.schema.json 一致。MessageKey 名稱（`horizon.now` / `priority.must` 等）在字典與 ReviewPanel 的 `t(\`horizon.${...}\`)` 拼接一致。
- ✅ **Backward compatibility**：Task 4 確保舊 draft（無 roadmap 欄位）能正確載入；Task 2、3 的條件 spread 確保未填欄位不會出現在 YAML，舊行為對「沒填 roadmap」的 draft 完全等價。
- ✅ **Validation 仍鬆**：本計劃完全不動 `validation.ts`，AGENTS.md 的「Validation is intentionally loose」invariant 保持。

---

_本計劃為 gap analysis 第 1 項（Roadmap 欄位）的可執行落地版本，預估完成時間 3–5 小時。其他項次（INVEST warning、successSignals 結構化、RAID id+status…）應另起 plan，不在本計劃範圍。_
