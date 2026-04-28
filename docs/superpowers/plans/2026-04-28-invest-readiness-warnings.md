# INVEST / Definition of Ready 驗證實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 wizard 不阻擋下載的前提下，補上「Story 故事就緒度（INVEST / Definition of Ready）」的驗證警示，並在 ReviewPanel 醒目分群顯示，讓 PO 看見 INVEST 落差但仍能照舊匯出 YAML。

**Architecture:** `ValidationIssue` 加 `category?: "invest" | "general"` 標籤，把現有的 `story_missing_acceptance_criteria` / `story_missing_examples` 標為 `"invest"`；新增三條 INVEST 警示：`story_orphan_examples`（per-story，有 example 但無 AC）、`draft_acceptance_criteria_without_examples`（draft-level summary，有任何 AC 但完全無 example）、`story_acceptance_criteria_not_gwt`（per-story，AC 缺 Given/When/Then 結構）。`ReviewPanel` 把 `category === "invest"` 的 warning 拉到專屬區塊頂端顯示。所有變更為非阻擋警示，不破壞 `validation.ts` 「intentionally loose」的原則。

**Tech Stack:** TypeScript（嚴格 nullable）、React 19（Next.js 15 App Router）、Vitest（jsdom）、Bun。

---

## File Structure

| 檔案 | 變更類型 | 責任 |
|------|---------|------|
| `src/features/spec-wizard/model/specTypes.ts` | Modify | `ValidationIssue` 新增選填的 `category: "invest" \| "general"` |
| `src/features/spec-wizard/model/validation.ts` | Modify | 既有兩條 INVEST 警示加 `category`；新增 `story_orphan_examples`、`draft_acceptance_criteria_without_examples`、`story_acceptance_criteria_not_gwt` 三條警示與 `isGwtFormatted` 工具函式 |
| `src/features/spec-wizard/i18n/messageKeys.ts` | Modify | 新增 4 個 MessageKey union 成員 |
| `src/features/spec-wizard/i18n/dictionaries.ts` | Modify | zh-TW / en 各補對應 4 條字串 |
| `src/features/spec-wizard/components/ReviewPanel.tsx` | Modify | 把 INVEST warnings 抽出獨立區塊置頂渲染 |
| `src/features/spec-wizard/test/fixtures.ts` | Modify | 新增 `draftWithGwtAc()` / `draftWithPlainAc()` 兩個工廠（僅用於 GWT 測試） |
| `src/features/spec-wizard/__tests__/validation.test.ts` | Modify | 新增四組測試覆蓋新警示與 category 標籤 |
| `src/features/spec-wizard/__tests__/reviewPanel.test.tsx` | Modify | 新增測試確認 INVEST 區塊置頂渲染並有獨立標題 |

---

## Task 1: 為 ValidationIssue 加上 category 並標註既有 INVEST 警示

**Files:**
- Modify: `src/features/spec-wizard/model/specTypes.ts:86-91`
- Modify: `src/features/spec-wizard/model/validation.ts:121-143`
- Modify: `src/features/spec-wizard/__tests__/validation.test.ts:1-106`

- [ ] **Step 1: 改寫 minimal-valid-draft 的測試（紅）**

把 `src/features/spec-wizard/__tests__/validation.test.ts` 第 7~13 行的測試替換為：

```ts
it("accepts a minimal valid draft and tags story-level INVEST warnings", () => {
  const result = validateDraft(minimalValidDraft())

  expect(result.blockingErrors).toEqual([])

  const acWarning = result.warnings.find((warning) => warning.code === "story_missing_acceptance_criteria")
  expect(acWarning).toBeDefined()
  expect(acWarning?.category).toBe("invest")

  const exampleWarning = result.warnings.find((warning) => warning.code === "story_missing_examples")
  expect(exampleWarning).toBeDefined()
  expect(exampleWarning?.category).toBe("invest")
})
```

- [ ] **Step 2: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "accepts a minimal valid draft"
```

預期：FAIL，`category` 為 `undefined`。

- [ ] **Step 3: 在 specTypes.ts 加 category 欄位**

把 `src/features/spec-wizard/model/specTypes.ts:86-91` 的 `ValidationIssue` 改為：

```ts
export type ValidationCategory = "invest" | "general"

export type ValidationIssue = {
  code: string
  fieldPath: string
  messageKey?: MessageKey
  message?: string
  category?: ValidationCategory
}
```

- [ ] **Step 4: 在 validation.ts 既有兩條 INVEST 警示加上 category**

修改 `src/features/spec-wizard/model/validation.ts:128-142` 的兩個 push：

```ts
if (!hasAcceptanceCriteria) {
  warnings.push({
    code: "story_missing_acceptance_criteria",
    fieldPath: `stories.${story.id}.acceptanceCriteria`,
    messageKey: "validation.storyMissingAcceptanceCriteria",
    category: "invest"
  })
}

if (!hasExamples) {
  warnings.push({
    code: "story_missing_examples",
    fieldPath: `stories.${story.id}.examples`,
    messageKey: "validation.storyMissingExamples",
    category: "invest"
  })
}
```

- [ ] **Step 5: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "accepts a minimal valid draft"
```

預期：PASS。

- [ ] **Step 6: 跑全部 validation 測試確認沒有回歸**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts
```

預期：全部 PASS（`treats blank criteria and examples as missing` 等舊測試只比對 code，不會受 category 影響）。

- [ ] **Step 7: Commit**

```bash
git add src/features/spec-wizard/model/specTypes.ts src/features/spec-wizard/model/validation.ts src/features/spec-wizard/__tests__/validation.test.ts
git commit -m "feat: [spec-wizard] ValidationIssue 新增 category 並標註 INVEST 警示"
```

---

## Task 2: 新增 story_orphan_examples 警示（per-story，有 example 卻無 AC）

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`
- Modify: `src/features/spec-wizard/__tests__/validation.test.ts`
- Modify: `src/features/spec-wizard/model/validation.ts`

- [ ] **Step 1: 新增 MessageKey union 成員**

在 `src/features/spec-wizard/i18n/messageKeys.ts` 的 `validation.*` 區塊（第 103~118 行附近）加上：

```ts
  | "validation.storyOrphanExamples"
```

- [ ] **Step 2: 新增 zh-TW 字典條目**

在 `src/features/spec-wizard/i18n/dictionaries.ts` 第 113 行（`storyMissingExamples` 之後）新增：

```ts
"validation.storyOrphanExamples": "故事有具體例子但沒有驗收條件，請補上對應的驗收條件。",
```

- [ ] **Step 3: 新增 en 字典條目**

在同檔的英文區塊（約第 351 行）新增：

```ts
"validation.storyOrphanExamples": "Story has examples but no acceptance criteria — add the criteria they map to.",
```

- [ ] **Step 4: 寫失敗測試（紅）**

在 `src/features/spec-wizard/__tests__/validation.test.ts` 加入新測試：

```ts
it("warns when a story has examples but no acceptance criteria", () => {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = []
  draft.epics[0].stories[0].examples = [
    { id: "EX-001", format: "natural-language", scenario: "Member enters wrong password three times." }
  ]

  const result = validateDraft(draft)
  const warning = result.warnings.find((w) => w.code === "story_orphan_examples")

  expect(warning).toBeDefined()
  expect(warning?.category).toBe("invest")
  expect(warning?.messageKey).toBe("validation.storyOrphanExamples")
  expect(warning?.fieldPath).toBe(`stories.${draft.epics[0].stories[0].id}.examples`)
})

it("does not warn story_orphan_examples when both AC and examples exist", () => {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [{ id: "AC-001", statement: "Returns 401 with safe message." }]
  draft.epics[0].stories[0].examples = [
    { id: "EX-001", format: "natural-language", scenario: "Member enters wrong password." }
  ]

  const result = validateDraft(draft)
  expect(result.warnings.find((w) => w.code === "story_orphan_examples")).toBeUndefined()
})
```

- [ ] **Step 5: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "story_orphan_examples"
```

預期：FAIL，找不到 `story_orphan_examples` warning。

- [ ] **Step 6: 在 validation.ts 實作偵測**

修改 `src/features/spec-wizard/model/validation.ts:121-143` 區塊，把 per-story 迴圈改為：

```ts
for (const story of stories) {
  const hasAcceptanceCriteria = story.acceptanceCriteria.some((criterion) => !isBlank(criterion.statement))
  const hasExamples = story.examples.some(
    (example) =>
      !isBlank(example.given) || !isBlank(example.when) || !isBlank(example.then) || !isBlank(example.scenario)
  )

  if (!hasAcceptanceCriteria) {
    warnings.push({
      code: "story_missing_acceptance_criteria",
      fieldPath: `stories.${story.id}.acceptanceCriteria`,
      messageKey: "validation.storyMissingAcceptanceCriteria",
      category: "invest"
    })
  }

  if (!hasExamples) {
    warnings.push({
      code: "story_missing_examples",
      fieldPath: `stories.${story.id}.examples`,
      messageKey: "validation.storyMissingExamples",
      category: "invest"
    })
  }

  if (hasExamples && !hasAcceptanceCriteria) {
    warnings.push({
      code: "story_orphan_examples",
      fieldPath: `stories.${story.id}.examples`,
      messageKey: "validation.storyOrphanExamples",
      category: "invest"
    })
  }
}
```

- [ ] **Step 7: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "story_orphan_examples"
```

預期：PASS（兩條測試都過）。

- [ ] **Step 8: 跑全部 validation 測試確認沒有回歸**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts
```

預期：PASS。

- [ ] **Step 9: Commit**

```bash
git add src/features/spec-wizard/model/validation.ts src/features/spec-wizard/i18n/messageKeys.ts src/features/spec-wizard/i18n/dictionaries.ts src/features/spec-wizard/__tests__/validation.test.ts
git commit -m "feat: [spec-wizard] 新增 story_orphan_examples INVEST 警示"
```

---

## Task 3: 新增 draft_acceptance_criteria_without_examples 警示（draft-level summary）

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`
- Modify: `src/features/spec-wizard/__tests__/validation.test.ts`
- Modify: `src/features/spec-wizard/model/validation.ts`

- [ ] **Step 1: 新增 MessageKey union 成員**

在 `src/features/spec-wizard/i18n/messageKeys.ts` 的 `validation.*` 區塊加上：

```ts
  | "validation.draftAcceptanceCriteriaWithoutExamples"
```

- [ ] **Step 2: 新增 zh-TW 字典條目**

在 `src/features/spec-wizard/i18n/dictionaries.ts` 對應位置新增：

```ts
"validation.draftAcceptanceCriteriaWithoutExamples": "整份草稿已有驗收條件但沒有任何具體例子；建議每條 AC 都搭配一個範例情境。",
```

- [ ] **Step 3: 新增 en 字典條目**

```ts
"validation.draftAcceptanceCriteriaWithoutExamples": "Draft has acceptance criteria but no examples; pair each AC with a concrete scenario.",
```

- [ ] **Step 4: 寫失敗測試（紅）**

在 `src/features/spec-wizard/__tests__/validation.test.ts` 加入：

```ts
it("warns at draft level when AC exist but no examples anywhere", () => {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [{ id: "AC-001", statement: "Return 401." }]
  draft.epics[0].stories[0].examples = []

  const result = validateDraft(draft)
  const warning = result.warnings.find((w) => w.code === "draft_acceptance_criteria_without_examples")

  expect(warning).toBeDefined()
  expect(warning?.category).toBe("invest")
  expect(warning?.messageKey).toBe("validation.draftAcceptanceCriteriaWithoutExamples")
  expect(warning?.fieldPath).toBe("epics")
})

it("does not warn draft_acceptance_criteria_without_examples when no AC exist", () => {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = []
  draft.epics[0].stories[0].examples = []

  const result = validateDraft(draft)
  expect(
    result.warnings.find((w) => w.code === "draft_acceptance_criteria_without_examples")
  ).toBeUndefined()
})

it("does not warn draft_acceptance_criteria_without_examples when at least one example exists", () => {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [{ id: "AC-001", statement: "Return 401." }]
  draft.epics[0].stories[0].examples = [
    { id: "EX-001", format: "natural-language", scenario: "Wrong password three times." }
  ]

  const result = validateDraft(draft)
  expect(
    result.warnings.find((w) => w.code === "draft_acceptance_criteria_without_examples")
  ).toBeUndefined()
})
```

- [ ] **Step 5: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "draft_acceptance_criteria_without_examples"
```

預期：FAIL，找不到該 warning。

- [ ] **Step 6: 在 validation.ts 實作 draft-level 偵測**

在 `src/features/spec-wizard/model/validation.ts` 中新增 helper 並在 `validateDraft` 結尾（return 之前）加入判斷。

在檔案頂部 helper 區（`function nonBlankItems` 之後）加：

```ts
function draftHasAnyAcceptanceCriterion(draft: FeatureDraft): boolean {
  return getStories(draft).some((story) =>
    story.acceptanceCriteria.some((criterion) => !isBlank(criterion.statement))
  )
}

function draftHasAnyExample(draft: FeatureDraft): boolean {
  return getStories(draft).some((story) =>
    story.examples.some(
      (example) =>
        !isBlank(example.given) || !isBlank(example.when) || !isBlank(example.then) || !isBlank(example.scenario)
    )
  )
}
```

接著在 `validateDraft` 中，於現有 per-story 迴圈之後、`agentBoundaries.constraints` 檢查之前，加入：

```ts
if (draftHasAnyAcceptanceCriterion(draft) && !draftHasAnyExample(draft)) {
  warnings.push({
    code: "draft_acceptance_criteria_without_examples",
    fieldPath: "epics",
    messageKey: "validation.draftAcceptanceCriteriaWithoutExamples",
    category: "invest"
  })
}
```

- [ ] **Step 7: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "draft_acceptance_criteria_without_examples"
```

預期：PASS（三條測試都過）。

- [ ] **Step 8: 跑全部 validation 測試確認沒有回歸**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts
```

預期：PASS。

- [ ] **Step 9: Commit**

```bash
git add src/features/spec-wizard/model/validation.ts src/features/spec-wizard/i18n/messageKeys.ts src/features/spec-wizard/i18n/dictionaries.ts src/features/spec-wizard/__tests__/validation.test.ts
git commit -m "feat: [spec-wizard] 新增 draft 層級 AC-without-examples INVEST 警示"
```

---

## Task 4: 新增 story_acceptance_criteria_not_gwt 警示（per-story，AC 缺 GWT 結構）

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`
- Modify: `src/features/spec-wizard/test/fixtures.ts`
- Modify: `src/features/spec-wizard/__tests__/validation.test.ts`
- Modify: `src/features/spec-wizard/model/validation.ts`

- [ ] **Step 1: 新增 MessageKey union 成員**

在 `src/features/spec-wizard/i18n/messageKeys.ts` 的 `validation.*` 區塊加上：

```ts
  | "validation.storyAcceptanceCriteriaNotGwt"
```

- [ ] **Step 2: 新增 zh-TW 字典條目**

```ts
"validation.storyAcceptanceCriteriaNotGwt": "故事的驗收條件可改寫為 Given / When / Then 三段格式，讓行為更明確。",
```

- [ ] **Step 3: 新增 en 字典條目**

```ts
"validation.storyAcceptanceCriteriaNotGwt": "Acceptance criteria can be rewritten in Given / When / Then form for clarity.",
```

- [ ] **Step 4: 加 fixture 工廠**

在 `src/features/spec-wizard/test/fixtures.ts` 末尾新增：

```ts
export function draftWithGwtAc(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [
    {
      id: "AC-001",
      statement: "Given the member enters a wrong password, when they submit, then the form shows a safe message."
    }
  ]
  draft.epics[0].stories[0].examples = [
    { id: "EX-001", format: "natural-language", scenario: "Wrong password three times in a row." }
  ]
  return draft
}

export function draftWithPlainAc(): FeatureDraft {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [
    { id: "AC-001", statement: "登入失敗時要顯示安全訊息。" }
  ]
  draft.epics[0].stories[0].examples = [
    { id: "EX-001", format: "natural-language", scenario: "連續輸錯三次密碼。" }
  ]
  return draft
}
```

- [ ] **Step 5: 寫失敗測試（紅）**

在 `src/features/spec-wizard/__tests__/validation.test.ts` 頂部 import 加入 `draftWithGwtAc, draftWithPlainAc`，並新增：

```ts
it("warns when a story has AC but none in Given/When/Then format", () => {
  const draft = draftWithPlainAc()

  const result = validateDraft(draft)
  const warning = result.warnings.find((w) => w.code === "story_acceptance_criteria_not_gwt")

  expect(warning).toBeDefined()
  expect(warning?.category).toBe("invest")
  expect(warning?.messageKey).toBe("validation.storyAcceptanceCriteriaNotGwt")
  expect(warning?.fieldPath).toBe(`stories.${draft.epics[0].stories[0].id}.acceptanceCriteria`)
})

it("does not warn story_acceptance_criteria_not_gwt when at least one AC uses English GWT keywords", () => {
  const draft = draftWithGwtAc()

  const result = validateDraft(draft)
  expect(result.warnings.find((w) => w.code === "story_acceptance_criteria_not_gwt")).toBeUndefined()
})

it("does not warn story_acceptance_criteria_not_gwt when at least one AC uses Chinese GWT keywords", () => {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = [
    { id: "AC-001", statement: "假設使用者已登入，當點擊匯出按鈕，那麼系統下載 PDF。" }
  ]
  draft.epics[0].stories[0].examples = [
    { id: "EX-001", format: "natural-language", scenario: "已登入後點擊匯出。" }
  ]

  const result = validateDraft(draft)
  expect(result.warnings.find((w) => w.code === "story_acceptance_criteria_not_gwt")).toBeUndefined()
})

it("does not warn story_acceptance_criteria_not_gwt when story has no AC", () => {
  const draft = minimalValidDraft()
  draft.epics[0].stories[0].acceptanceCriteria = []

  const result = validateDraft(draft)
  expect(result.warnings.find((w) => w.code === "story_acceptance_criteria_not_gwt")).toBeUndefined()
})
```

- [ ] **Step 6: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "story_acceptance_criteria_not_gwt"
```

預期：FAIL，找不到該 warning。

- [ ] **Step 7: 在 validation.ts 加 helper 並接到 per-story 迴圈**

在 `src/features/spec-wizard/model/validation.ts` 的 helper 區（`function hasHanText` 之後）新增：

```ts
function isGwtFormatted(text: string): boolean {
  const lower = text.toLowerCase()
  const hasEnGiven = /\bgiven\b/.test(lower)
  const hasEnWhen = /\bwhen\b/.test(lower)
  const hasEnThen = /\bthen\b/.test(lower)
  const hasZhGiven = /(假設|前提)/.test(text)
  const hasZhWhen = /(當|若)/.test(text)
  const hasZhThen = /(那麼|則|接著)/.test(text)
  return (hasEnGiven && hasEnWhen && hasEnThen) || (hasZhGiven && hasZhWhen && hasZhThen)
}
```

在 per-story 迴圈內、`hasExamples` 計算之後加上：

```ts
const acStatements = story.acceptanceCriteria
  .map((criterion) => criterion.statement)
  .filter((statement) => !isBlank(statement))

if (acStatements.length > 0 && !acStatements.some(isGwtFormatted)) {
  warnings.push({
    code: "story_acceptance_criteria_not_gwt",
    fieldPath: `stories.${story.id}.acceptanceCriteria`,
    messageKey: "validation.storyAcceptanceCriteriaNotGwt",
    category: "invest"
  })
}
```

- [ ] **Step 8: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts -t "story_acceptance_criteria_not_gwt"
```

預期：PASS（四條測試都過）。

- [ ] **Step 9: 跑全部 validation 測試確認沒有回歸**

```bash
bunx vitest run src/features/spec-wizard/__tests__/validation.test.ts
```

預期：PASS。

- [ ] **Step 10: Commit**

```bash
git add src/features/spec-wizard/model/validation.ts src/features/spec-wizard/i18n/messageKeys.ts src/features/spec-wizard/i18n/dictionaries.ts src/features/spec-wizard/test/fixtures.ts src/features/spec-wizard/__tests__/validation.test.ts
git commit -m "feat: [spec-wizard] 新增 GWT 格式提示 INVEST 警示"
```

---

## Task 5: ReviewPanel 把 INVEST 警示拉到專屬區塊置頂顯示

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`
- Modify: `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`
- Modify: `src/features/spec-wizard/components/ReviewPanel.tsx`

- [ ] **Step 1: 新增區塊標題的 MessageKey**

在 `src/features/spec-wizard/i18n/messageKeys.ts` 與 `review.*` 同區塊新增：

```ts
  | "review.investHeading"
```

- [ ] **Step 2: 新增 zh-TW 字典條目**

```ts
"review.investHeading": "故事就緒檢查（INVEST）",
```

- [ ] **Step 3: 新增 en 字典條目**

```ts
"review.investHeading": "Story Readiness (INVEST)",
```

- [ ] **Step 4: 寫失敗測試（紅）**

在 `src/features/spec-wizard/__tests__/reviewPanel.test.tsx` 末尾新增：

```ts
describe("ReviewPanel — INVEST warnings group", () => {
  it("renders INVEST warnings under a dedicated heading separate from general warnings", () => {
    render(
      <I18nProvider>
        <ReviewPanel draft={minimalValidDraft()} />
      </I18nProvider>
    )

    const investHeading = screen.getByText("故事就緒檢查（INVEST）")
    expect(investHeading).toBeInTheDocument()

    const investBlock = investHeading.closest(".warning")
    expect(investBlock).not.toBeNull()
    expect(investBlock?.textContent).toContain("故事缺少驗收條件")
    expect(investBlock?.textContent).toContain("故事缺少範例")

    expect(investBlock?.textContent).not.toContain("建議補充限制條件")
  })
})
```

- [ ] **Step 5: 跑測試確認失敗**

```bash
bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "INVEST warnings group"
```

預期：FAIL，找不到「故事就緒檢查（INVEST）」標題。

- [ ] **Step 6: 改寫 ReviewPanel 把 INVEST 警示分群**

修改 `src/features/spec-wizard/components/ReviewPanel.tsx:93-99` 的 warnings 區塊。先在 `validation` 計算後加入分群：

```tsx
const investWarnings = validation.warnings.filter((warning) => warning.category === "invest")
const otherWarnings = validation.warnings.filter((warning) => warning.category !== "invest")
```

然後把現有的 warnings 區塊替換為：

```tsx
{investWarnings.length > 0 ? (
  <div className="warning warning--invest">
    <p>
      <strong>{t("review.investHeading")}</strong>
    </p>
    {investWarnings.map((issue, index) => (
      <p key={`${issue.code}-${index}`}>{issue.message || (issue.messageKey && t(issue.messageKey))}</p>
    ))}
  </div>
) : null}
{otherWarnings.length > 0 ? (
  <div className="warning">
    {otherWarnings.map((issue, index) => (
      <p key={`${issue.code}-${index}`}>{issue.message || (issue.messageKey && t(issue.messageKey))}</p>
    ))}
  </div>
) : null}
```

- [ ] **Step 7: 跑測試確認通過**

```bash
bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "INVEST warnings group"
```

預期：PASS。

- [ ] **Step 8: 跑全部 reviewPanel 測試確認沒有回歸**

```bash
bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx
```

預期：PASS。

- [ ] **Step 9: Commit**

```bash
git add src/features/spec-wizard/components/ReviewPanel.tsx src/features/spec-wizard/i18n/messageKeys.ts src/features/spec-wizard/i18n/dictionaries.ts src/features/spec-wizard/__tests__/reviewPanel.test.tsx
git commit -m "feat: [spec-wizard] ReviewPanel 把 INVEST 警示分群置頂顯示"
```

---

## Task 6: 全套測試與型別檢查

**Files:**
- Read-only sweep。

- [ ] **Step 1: 跑完整測試套件**

```bash
bun run test
```

預期：全部 PASS。若有任何意外的 snapshot 漂移或既有測試斷言被拉到新行為，回到對應 Task 修正而不是調寬測試斷言。

- [ ] **Step 2: 跑型別檢查**

```bash
npx tsc --noEmit
```

預期：無錯誤（特別檢查 dictionaries.ts 的 4 個新 MessageKey 是否兩種語系都齊全）。

- [ ] **Step 3: 跑 lint**

```bash
bun run lint
```

預期：無錯誤、無新增 warning。

- [ ] **Step 4: 若以上三步都過，無需額外 commit**

如果 tsc / lint 抓到任何漏改，補修後 commit：

```bash
git commit -am "chore: [spec-wizard] 修正 INVEST 警示相關 lint / 型別漏改"
```
