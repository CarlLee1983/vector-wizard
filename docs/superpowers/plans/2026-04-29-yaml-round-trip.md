# #5 YAML Round-trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 wizard 新增「YAML → FeatureDraft」反向解析能力，讓使用者可以把上一輪匯出的 YAML 拉回 Draft Manager 繼續編輯，閉合敏捷 inspect-adapt 迴圈。

**Architecture:**
- **Pure parser (`services/yamlParser.ts`)** —— 不依賴 `js-yaml`，照舊用「無第三方套件」的紀律。emitter (`yamlSerializer.ts`) 產出的格式是受限子集（兩格縮排、所有字串都被 `JSON.stringify` 包成雙引號、空陣列以 inline `[]`、無 anchor / multiline literal），parser 也只負責解析這個子集。
- **Mapper (`services/yamlParser.ts` 同檔)** —— 把解析出的 plain object 反向映射回 `FeatureDraft` 形狀，再丟進既有的 `normalizeDraft()` 走一次（與 JSON 匯入共用 migration 路徑）。
- **DraftStore action (`importDraftYaml`)** —— 與 `importDraftJson` 對稱新增一個 store action，client 端走完全相同的 toast / activeDraft 切換流程。
- **UI (`DraftManagerModal.tsx`)** —— 多一顆「匯入 YAML」檔案選擇按鈕；現有的 paste 區改成自動偵測（先嘗試 `JSON.parse`，fallthrough 走 YAML parser）。
- **Server 不需要動** —— 整套都在 client 端，無需 API route，無需 `.vector/import/`。

**Tech Stack:** TypeScript（嚴格型別）、Vitest + jsdom + React Testing Library、純 ESM 客戶端模組、無新增 npm 依賴。

---

## YAML 子集規格（parser 必須涵蓋）

emitter 在 `services/yamlSerializer.ts:44-78` 的 `renderYaml()` 確定產出以下形狀：

```yaml
schemaVersion: "0.2"
metadata:
  title: "Login error message improvement"
  owner: "PM Team"
  locale: "en"
  id: "FT-001"            # optional
  horizon: "now"          # optional
  priority: "must"        # optional
  dependsOn:              # optional, omit when empty
    - "FT-002"
    - "FT-005"
  createdAt: "2026-04-26"
  status: "draft"
summary:
  problem: "..."
  desiredOutcome: "..."
productSpec:
  goal:
    statement: "..."
    successSignals:
      - statement: "..."
        metric: "..."     # optional
        threshold: "..."  # optional
        kind: "leading"   # optional
  impacts:
    - actor: "..."
      impact: "..."
  deliverables:
    - name: "..."
      description: "..."
  userActivities:
    - actor: "..."
      activity: "..."
  epics:
    - title: "..."
      stories:
        - id: "US-001"
          title: "..."
          userStory: "..."
          acceptanceCriteria:
            - id: "AC-001"
              statement: "..."
          examples:
            - id: "EX-001"
              format: "given-when-then"
              given: "..."
              when: "..."
              then: "..."
              scenario: "..."
agentSpec:
  nonGoals: []
  constraints: []
  testExpectations: []
  qualityWarnings:
    - id: "R-001"
      text: "..."
      status: "validating"
      mitigation: "..."   # optional
  openQuestions:
    - id: "Q-001"
      text: "..."
      status: "open"
```

### Tokenizer 假設（與 emitter 1:1 對齊）

1. 縮排只用空格，emitter 永遠輸出 2 格／層；parser 以「相對 indent」判斷層級（不要求剛好 2 格，但要求一致）。
2. 所有字串純量都是 JSON-quoted（`"..."`），可用 `JSON.parse(scalar)` 直接還原。
3. `null`、`true`、`false`、純數字也走 `JSON.parse(scalar)`。
4. 空陣列以 inline `[]` 表示（emitter 第 47 行強制此行為），不會出現空 mapping `{}`。
5. 註解（`# ...`）emitter 不會輸出，但 parser 必須能容忍——遇到 `^\s*#` 直接跳過。
6. 列表元素以 `- ` 起頭；`- key: value` 形態時，後續同物件的鍵以「`- ` 之後第一個字元的 column」為基準縮排。

### 反向映射規則

| YAML 路徑 | FeatureDraft 路徑 | 備註 |
|-----------|-------------------|------|
| `schemaVersion` | （捨棄；只用於版本檢查） | 接受 `"0.1"` 或 `"0.2"`，其他丟 `YamlParseError` |
| `metadata.{title,owner,locale,id,horizon,priority,dependsOn}` | `metadata.{...}` | 直接搬 |
| `metadata.{createdAt,status}` | （捨棄） | export-only |
| `summary.{problem,desiredOutcome}` | `summary.{...}` | 直接搬 |
| `productSpec.goal.{statement,successSignals}` | `goal.{statement,successSignals}` | 直接搬 |
| `productSpec.impacts[]` | `impacts[]` | **id 需合成**（`IM-001`...） |
| `productSpec.deliverables[]` | `deliverables[]` | **id 需合成**（`DE-001`...） |
| `productSpec.userActivities[]` | `userActivities[]` | **id 需合成**（`UA-001`...） |
| `productSpec.epics[]` | `epics[]` | **id 需合成**（`EP-001`...）；`stories[].{id,...}` 已存在於 YAML 直接搬 |
| `agentSpec.nonGoals` | `agentBoundaries.nonGoals` | 字串陣列 |
| `agentSpec.constraints` | `agentBoundaries.constraints` | 字串陣列 |
| `agentSpec.testExpectations` | `agentBoundaries.testExpectations` | 字串陣列 |
| `agentSpec.qualityWarnings` | `agentBoundaries.risks` | RaidEntry[] |
| `agentSpec.openQuestions` | `agentBoundaries.openQuestions` | RaidEntry[] |

合成完欄位後，整個物件再過一次 `normalizeDraft()`（`persistence/draftStorage.ts:82`），承接所有 legacy migration（success signal 物件化、RAID 物件化、roadmap 欄位 fallback）。

---

## File Structure

| 路徑 | 動作 | 角色 |
|------|------|------|
| `src/features/spec-wizard/services/yamlParser.ts` | 新增 | export `parseYamlDocument(raw)`、`yamlToDraft(raw)`、`YamlParseError` |
| `src/features/spec-wizard/__tests__/yamlParser.test.ts` | 新增 | tokenizer 單元 + 反向映射 + 例外路徑 |
| `src/features/spec-wizard/__tests__/yamlRoundTrip.test.ts` | 新增 | `draftToYaml → yamlToDraft` 在所有 fixtures 上 deepEqual |
| `src/features/spec-wizard/persistence/draftStore.ts` | 修改 | 新增 `importDraftYaml(raw): DraftId` |
| `src/features/spec-wizard/__tests__/draftStore.test.ts` | 修改 | 新增 `importDraftYaml` 的整合測試 |
| `src/features/spec-wizard/hooks/useDraftStore.ts` | 修改 | 在 `UseDraftStoreValue` 暴露 `importDraftYaml` |
| `src/features/spec-wizard/__tests__/useDraftStore.test.tsx` | 修改 | hook 行為測試 |
| `src/features/spec-wizard/i18n/messageKeys.ts` | 修改 | 新增 4 條 `draftManager.*` 鍵 |
| `src/features/spec-wizard/i18n/dictionaries.ts` | 修改 | `zh-TW` / `en` 對應翻譯 |
| `src/features/spec-wizard/components/DraftManagerModal.tsx` | 修改 | 新增「匯入 YAML」按鈕；paste 自動偵測 |
| `src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx` | 修改 | 新增 YAML import flow 測試 |
| `README.md` / `README.zh-TW.md` | 修改 | 補上 YAML 反向匯入用法 |
| `AGENTS.md` | 修改 | 在「Data flow」段落補上反向路徑 |
| `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md` | 修改 | 將 #5 標記為 ✅ 已實作（保留 feedbackLog 作為未來工作） |

### 對外 API

```ts
// services/yamlParser.ts
export class YamlParseError extends Error {
  readonly line: number
  readonly cause?: string
  constructor(message: string, line: number, cause?: string)
}

export function parseYamlDocument(raw: string): unknown

export function yamlToDraft(raw: string): {
  schemaVersion: string
  draft: FeatureDraft
}
```

```ts
// persistence/draftStore.ts
export function importDraftYaml(raw: string): string
```

任一階段失敗（tokenize / required-key 缺失 / scalar 解析）都丟 `YamlParseError`，UI 端 `catch` 後顯示 `draftManager.importYamlError` 訊息（附行號）。

---

## Task Breakdown

### Task 1: 建立 YamlParseError 與最小 tokenizer 骨架（TDD 入口）

**Files:**
- Create: `src/features/spec-wizard/services/yamlParser.ts`
- Create: `src/features/spec-wizard/__tests__/yamlParser.test.ts`

- [ ] **Step 1: 寫第一條失敗測試（throws on empty input）**

```ts
// src/features/spec-wizard/__tests__/yamlParser.test.ts
import { describe, expect, it } from "vitest"
import { YamlParseError, parseYamlDocument } from "../services/yamlParser"

describe("parseYamlDocument", () => {
  it("throws YamlParseError on empty input", () => {
    expect(() => parseYamlDocument("")).toThrow(YamlParseError)
    expect(() => parseYamlDocument("   \n  \n")).toThrow(YamlParseError)
  })
})
```

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts`
Expected: FAIL（找不到 module）。

- [ ] **Step 3: 寫最小骨架讓第一條 pass**

```ts
// src/features/spec-wizard/services/yamlParser.ts
export class YamlParseError extends Error {
  readonly line: number
  readonly cause?: string

  constructor(message: string, line: number, cause?: string) {
    super(message)
    this.name = "YamlParseError"
    this.line = line
    this.cause = cause
  }
}

export function parseYamlDocument(raw: string): unknown {
  const stripped = raw.replace(/\r\n?/g, "\n")
  const lines = stripped.split("\n")
  const meaningful = lines.filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"))
  if (meaningful.length === 0) {
    throw new YamlParseError("YAML document is empty", 0)
  }
  throw new Error("not implemented")
}
```

- [ ] **Step 4: 跑測試確認第一條 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts`
Expected: 1 passed。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/yamlParser.ts \
        src/features/spec-wizard/__tests__/yamlParser.test.ts
git commit -m "feat: [yaml-round-trip] 新增 YamlParseError 與 parser 骨架（#5）"
```

---

### Task 2: 實作 scalar 解析（quoted string / 數字 / null / boolean）

**Files:**
- Modify: `src/features/spec-wizard/services/yamlParser.ts`
- Modify: `src/features/spec-wizard/__tests__/yamlParser.test.ts`

- [ ] **Step 1: 加 scalar 測試**

```ts
// 加入 yamlParser.test.ts
import { parseScalar } from "../services/yamlParser"

describe("parseScalar", () => {
  it("parses JSON-quoted strings", () => {
    expect(parseScalar('"hello"', 1)).toBe("hello")
    expect(parseScalar('"with \\"quote\\""', 1)).toBe('with "quote"')
    expect(parseScalar('""', 1)).toBe("")
  })

  it("parses literal null/true/false/number", () => {
    expect(parseScalar("null", 1)).toBeNull()
    expect(parseScalar("true", 1)).toBe(true)
    expect(parseScalar("false", 1)).toBe(false)
    expect(parseScalar("42", 1)).toBe(42)
  })

  it("parses empty inline array", () => {
    expect(parseScalar("[]", 1)).toEqual([])
  })

  it("throws YamlParseError with line on bad scalar", () => {
    expect(() => parseScalar("undefined", 7)).toThrow(YamlParseError)
    try {
      parseScalar("undefined", 7)
    } catch (err) {
      expect(err).toBeInstanceOf(YamlParseError)
      expect((err as YamlParseError).line).toBe(7)
    }
  })
})
```

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts -t "parseScalar"`
Expected: FAIL（找不到 export）。

- [ ] **Step 3: 實作 parseScalar**

```ts
// 加進 yamlParser.ts，匯出
export function parseScalar(token: string, lineNumber: number): unknown {
  const trimmed = token.trim()
  if (trimmed === "[]") return []
  try {
    return JSON.parse(trimmed)
  } catch (err) {
    throw new YamlParseError(`Cannot parse scalar: ${trimmed}`, lineNumber, (err as Error).message)
  }
}
```

- [ ] **Step 4: 跑測試確認 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts -t "parseScalar"`
Expected: 4 passed。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/yamlParser.ts \
        src/features/spec-wizard/__tests__/yamlParser.test.ts
git commit -m "feat: [yaml-round-trip] parser 支援 JSON 風格 scalar（#5）"
```

---

### Task 3: 實作 tokenize（分行 + 縮排 + line type 偵測）

**Files:**
- Modify: `src/features/spec-wizard/services/yamlParser.ts`
- Modify: `src/features/spec-wizard/__tests__/yamlParser.test.ts`

- [ ] **Step 1: 加 tokenize 測試**

```ts
// 加進 yamlParser.test.ts
import { tokenizeYaml } from "../services/yamlParser"

describe("tokenizeYaml", () => {
  it("classifies key-value with inline scalar", () => {
    expect(tokenizeYaml('schemaVersion: "0.2"')).toEqual([
      { line: 1, indent: 0, kind: "kv-inline", key: "schemaVersion", value: '"0.2"' }
    ])
  })

  it("classifies key with nested children (no inline value)", () => {
    expect(tokenizeYaml("metadata:")).toEqual([{ line: 1, indent: 0, kind: "kv-block", key: "metadata" }])
  })

  it("classifies list item with inline scalar", () => {
    expect(tokenizeYaml('  - "FT-002"')).toEqual([{ line: 1, indent: 2, kind: "list-scalar", value: '"FT-002"' }])
  })

  it("classifies list item that opens an inline kv", () => {
    expect(tokenizeYaml('  - id: "R-001"')).toEqual([
      { line: 1, indent: 2, kind: "list-kv-inline", key: "id", value: '"R-001"' }
    ])
  })

  it("classifies list item that opens a block kv", () => {
    expect(tokenizeYaml("  - title:")).toEqual([{ line: 1, indent: 2, kind: "list-kv-block", key: "title" }])
  })

  it("strips full-line comments and blank lines", () => {
    const input = ["# top comment", "", "metadata:", '  title: "x"'].join("\n")
    expect(tokenizeYaml(input)).toEqual([
      { line: 3, indent: 0, kind: "kv-block", key: "metadata" },
      { line: 4, indent: 2, kind: "kv-inline", key: "title", value: '"x"' }
    ])
  })

  it("preserves line numbers across blanks", () => {
    const input = ["a: 1", "", "b: 2"].join("\n")
    expect(tokenizeYaml(input).map((t) => t.line)).toEqual([1, 3])
  })
})
```

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts -t "tokenizeYaml"`
Expected: FAIL。

- [ ] **Step 3: 實作 tokenizeYaml**

```ts
// 加進 yamlParser.ts，匯出

export type YamlToken =
  | { line: number; indent: number; kind: "kv-inline"; key: string; value: string }
  | { line: number; indent: number; kind: "kv-block"; key: string }
  | { line: number; indent: number; kind: "list-scalar"; value: string }
  | { line: number; indent: number; kind: "list-kv-inline"; key: string; value: string }
  | { line: number; indent: number; kind: "list-kv-block"; key: string }

const KEY_RE = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/

function countLeadingSpaces(line: string): number {
  let i = 0
  while (i < line.length && line[i] === " ") i += 1
  return i
}

export function tokenizeYaml(raw: string): YamlToken[] {
  const stripped = raw.replace(/\r\n?/g, "\n")
  const tokens: YamlToken[] = []
  const lines = stripped.split("\n")

  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1
    const original = lines[i]
    const trimmed = original.trim()
    if (trimmed.length === 0) continue
    if (trimmed.startsWith("#")) continue

    const indent = countLeadingSpaces(original)

    if (trimmed.startsWith("- ")) {
      const remainder = trimmed.slice(2)
      const kvMatch = KEY_RE.exec(remainder)
      if (kvMatch) {
        const [, key, value] = kvMatch
        if (value.length === 0) {
          tokens.push({ line: lineNumber, indent, kind: "list-kv-block", key })
        } else {
          tokens.push({ line: lineNumber, indent, kind: "list-kv-inline", key, value })
        }
      } else {
        tokens.push({ line: lineNumber, indent, kind: "list-scalar", value: remainder })
      }
      continue
    }

    const kvMatch = KEY_RE.exec(trimmed)
    if (!kvMatch) {
      throw new YamlParseError(`Unrecognized line: ${trimmed}`, lineNumber)
    }
    const [, key, value] = kvMatch
    if (value.length === 0) {
      tokens.push({ line: lineNumber, indent, kind: "kv-block", key })
    } else {
      tokens.push({ line: lineNumber, indent, kind: "kv-inline", key, value })
    }
  }

  return tokens
}
```

- [ ] **Step 4: 跑測試確認 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts -t "tokenizeYaml"`
Expected: 7 passed。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/yamlParser.ts \
        src/features/spec-wizard/__tests__/yamlParser.test.ts
git commit -m "feat: [yaml-round-trip] tokenize 五種行型別（#5）"
```

---

### Task 4: 組裝 parseYamlDocument（stack 風格 indent tree）

**Files:**
- Modify: `src/features/spec-wizard/services/yamlParser.ts`
- Modify: `src/features/spec-wizard/__tests__/yamlParser.test.ts`

- [ ] **Step 1: 加 parseYamlDocument 整合測試**

```ts
// 加進 yamlParser.test.ts 的 "parseYamlDocument" describe
it("parses a flat key-value document", () => {
  const yaml = ['a: "x"', 'b: "y"'].join("\n")
  expect(parseYamlDocument(yaml)).toEqual({ a: "x", b: "y" })
})

it("parses nested objects", () => {
  const yaml = ["metadata:", '  title: "Login"', '  locale: "en"'].join("\n")
  expect(parseYamlDocument(yaml)).toEqual({ metadata: { title: "Login", locale: "en" } })
})

it("parses array of scalars", () => {
  const yaml = ["dependsOn:", '  - "FT-002"', '  - "FT-005"'].join("\n")
  expect(parseYamlDocument(yaml)).toEqual({ dependsOn: ["FT-002", "FT-005"] })
})

it("parses array of objects with mixed inline + block kvs", () => {
  const yaml = [
    "qualityWarnings:",
    '  - id: "R-001"',
    '    text: "Edge"',
    '    status: "open"',
    '  - id: "R-002"',
    '    text: "Cold start"',
    '    status: "validating"',
    '    mitigation: "Warm pool"'
  ].join("\n")
  expect(parseYamlDocument(yaml)).toEqual({
    qualityWarnings: [
      { id: "R-001", text: "Edge", status: "open" },
      { id: "R-002", text: "Cold start", status: "validating", mitigation: "Warm pool" }
    ]
  })
})

it("parses inline empty array", () => {
  const yaml = ["nonGoals: []", "constraints: []"].join("\n")
  expect(parseYamlDocument(yaml)).toEqual({ nonGoals: [], constraints: [] })
})

it("parses deeply nested structure (epic > stories > acceptanceCriteria)", () => {
  const yaml = [
    "epics:",
    '  - title: "Login"',
    "    stories:",
    '      - id: "US-001"',
    '        title: "Show msg"',
    "        acceptanceCriteria:",
    '          - id: "AC-001"',
    '            statement: "GWT"'
  ].join("\n")
  expect(parseYamlDocument(yaml)).toEqual({
    epics: [
      {
        title: "Login",
        stories: [{ id: "US-001", title: "Show msg", acceptanceCriteria: [{ id: "AC-001", statement: "GWT" }] }]
      }
    ]
  })
})

it("throws YamlParseError when a list item appears outside any list-bearing key", () => {
  const yaml = '- "orphan"'
  expect(() => parseYamlDocument(yaml)).toThrow(YamlParseError)
})
```

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts -t "parseYamlDocument"`
Expected: FAIL（除「empty input」一條）。

- [ ] **Step 3: 實作 parseYamlDocument（stack 機）**

```ts
// 取代 yamlParser.ts 既有的 parseYamlDocument 占位實作

type ObjectFrame = {
  kind: "object"
  indent: number
  container: Record<string, unknown>
  pendingKey?: string
}
type ArrayFrame = { kind: "array"; indent: number; container: unknown[] }
type Frame = ObjectFrame | ArrayFrame

export function parseYamlDocument(raw: string): unknown {
  const tokens = tokenizeYaml(raw)
  if (tokens.length === 0) {
    throw new YamlParseError("YAML document is empty", 0)
  }

  const root: Record<string, unknown> = {}
  const stack: Frame[] = [{ kind: "object", indent: -1, container: root }]

  for (const token of tokens) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= token.indent) {
      stack.pop()
    }

    let top = stack[stack.length - 1]

    if (token.kind === "kv-inline" || token.kind === "kv-block") {
      if (top.kind !== "object") {
        throw new YamlParseError(`Expected list item, got "${token.key}:"`, token.line)
      }
      top.pendingKey = undefined
      if (token.kind === "kv-inline") {
        top.container[token.key] = parseScalar(token.value, token.line)
      } else {
        const placeholder: Record<string, unknown> = {}
        top.container[token.key] = placeholder
        stack.push({ kind: "object", indent: token.indent, container: placeholder, pendingKey: token.key })
      }
      continue
    }

    // list-* tokens — convert pending placeholder object to an array if needed
    if (top.kind === "object") {
      if (!top.pendingKey) {
        throw new YamlParseError("List item has no parent key", token.line)
      }
      const parent = stack[stack.length - 2]
      if (!parent || parent.kind !== "object") {
        throw new YamlParseError("List item's grandparent is not an object", token.line)
      }
      const arr: unknown[] = []
      parent.container[top.pendingKey] = arr
      const parentIndent = top.indent
      stack.pop()
      stack.push({ kind: "array", indent: parentIndent, container: arr })
      top = stack[stack.length - 1]
    }

    if (top.kind !== "array") {
      throw new YamlParseError("Expected to be inside an array frame", token.line)
    }

    if (token.kind === "list-scalar") {
      top.container.push(parseScalar(token.value, token.line))
      continue
    }

    // list-kv-inline / list-kv-block — each "- " starts a new object element
    const obj: Record<string, unknown> = {}
    top.container.push(obj)
    const objFrame: ObjectFrame = { kind: "object", indent: token.indent, container: obj }
    stack.push(objFrame)
    if (token.kind === "list-kv-inline") {
      obj[token.key] = parseScalar(token.value, token.line)
    } else {
      const placeholder: Record<string, unknown> = {}
      obj[token.key] = placeholder
      objFrame.pendingKey = token.key
      stack.push({ kind: "object", indent: token.indent, container: placeholder, pendingKey: token.key })
    }
  }

  return root
}
```

- [ ] **Step 4: 跑測試確認 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts`
Expected: 全部 PASS。

如果 frame 推算錯誤（例如 placeholder 沒被正確 pop）：用 `console.log(stack.map(f => ({k:f.kind,i:f.indent})))` 在每次 token 前 dump，對照實際 indent 驗證 stack 是否符合預期。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/yamlParser.ts \
        src/features/spec-wizard/__tests__/yamlParser.test.ts
git commit -m "feat: [yaml-round-trip] parseYamlDocument 還原 plain object（#5）"
```

---

### Task 5: 反向映射 yamlToDraft（plain object → FeatureDraft）

**Files:**
- Modify: `src/features/spec-wizard/services/yamlParser.ts`
- Modify: `src/features/spec-wizard/__tests__/yamlParser.test.ts`

- [ ] **Step 1: 加 yamlToDraft 失敗測試**

```ts
// 加進 yamlParser.test.ts
import { yamlToDraft } from "../services/yamlParser"
import { draftToYaml } from "../services/yamlSerializer"
import { minimalValidDraft } from "../test/fixtures"

describe("yamlToDraft", () => {
  it("requires top-level metadata, productSpec, agentSpec keys", () => {
    expect(() => yamlToDraft('schemaVersion: "0.2"')).toThrow(YamlParseError)
  })

  it("rejects unknown schemaVersion", () => {
    const yaml = ['schemaVersion: "9.9"', "metadata:", '  title: "x"', '  locale: "en"'].join("\n")
    expect(() => yamlToDraft(yaml)).toThrow(YamlParseError)
  })

  it("synthesizes ids for impacts/deliverables/userActivities/epics", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { draft } = yamlToDraft(yaml)
    expect(draft.impacts[0].id).toBe("IM-001")
    expect(draft.deliverables[0].id).toBe("DE-001")
    expect(draft.userActivities[0].id).toBe("UA-001")
    expect(draft.epics[0].id).toBe("EP-001")
  })

  it("preserves story / AC / example / RAID ids verbatim", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { draft } = yamlToDraft(yaml)
    expect(draft.epics[0].stories[0].id).toBe("US-001")
  })

  it("returns the schemaVersion alongside the draft", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { schemaVersion } = yamlToDraft(yaml)
    expect(schemaVersion).toBe("0.2")
  })

  it("drops export-only metadata.createdAt / metadata.status", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { draft } = yamlToDraft(yaml)
    expect((draft.metadata as Record<string, unknown>).createdAt).toBeUndefined()
    expect((draft.metadata as Record<string, unknown>).status).toBeUndefined()
  })

  it("maps qualityWarnings/openQuestions back to agentBoundaries.risks/openQuestions", () => {
    const yaml = [
      'schemaVersion: "0.2"',
      "metadata:",
      '  title: "x"',
      '  locale: "en"',
      "summary:",
      '  problem: ""',
      '  desiredOutcome: ""',
      "productSpec:",
      "  goal:",
      '    statement: "g"',
      "    successSignals: []",
      "  impacts: []",
      "  deliverables: []",
      "  userActivities: []",
      "  epics: []",
      "agentSpec:",
      "  nonGoals: []",
      "  constraints: []",
      "  testExpectations: []",
      "  qualityWarnings:",
      '    - id: "R-001"',
      '      text: "edge"',
      '      status: "open"',
      "  openQuestions:",
      '    - id: "Q-001"',
      '      text: "?"',
      '      status: "open"'
    ].join("\n")
    const { draft } = yamlToDraft(yaml)
    expect(draft.agentBoundaries.risks).toEqual([{ id: "R-001", text: "edge", status: "open" }])
    expect(draft.agentBoundaries.openQuestions).toEqual([{ id: "Q-001", text: "?", status: "open" }])
  })
})
```

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts -t "yamlToDraft"`
Expected: FAIL。

- [ ] **Step 3: 實作 yamlToDraft**

```ts
// 加進 yamlParser.ts
import type { FeatureDraft } from "../model/specTypes"
import { normalizeDraft } from "../persistence/draftStorage"

const SUPPORTED_SCHEMA_VERSIONS = ["0.1", "0.2"] as const

function asObject(value: unknown, line: number, label: string): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  throw new YamlParseError(`Expected ${label} to be an object`, line)
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  return []
}

function synthesizeIds(items: unknown[], prefix: string): Record<string, unknown>[] {
  return items.map((item, index) => {
    const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
    const fallback = `${prefix}-${String(index + 1).padStart(3, "0")}`
    const id = typeof obj.id === "string" && obj.id.trim().length > 0 ? obj.id : fallback
    return { ...obj, id }
  })
}

export function yamlToDraft(raw: string): { schemaVersion: string; draft: FeatureDraft } {
  const root = asObject(parseYamlDocument(raw), 1, "document root")

  const schemaVersionRaw = root.schemaVersion
  if (typeof schemaVersionRaw !== "string") {
    throw new YamlParseError("Missing schemaVersion", 1)
  }
  if (!(SUPPORTED_SCHEMA_VERSIONS as readonly string[]).includes(schemaVersionRaw)) {
    throw new YamlParseError(`Unsupported schemaVersion: ${schemaVersionRaw}`, 1)
  }

  const metadata = asObject(root.metadata, 1, "metadata")
  const productSpec = asObject(root.productSpec, 1, "productSpec")
  const agentSpec = asObject(root.agentSpec, 1, "agentSpec")
  const summary =
    root.summary && typeof root.summary === "object" && !Array.isArray(root.summary)
      ? (root.summary as Record<string, unknown>)
      : {}

  const goal = asObject(productSpec.goal, 1, "productSpec.goal")

  const {
    createdAt: _createdAt,
    status: _status,
    ...metaRest
  } = metadata as Record<string, unknown> & { createdAt?: unknown; status?: unknown }

  const candidate: unknown = {
    metadata: metaRest,
    summary,
    goal: {
      statement: typeof goal.statement === "string" ? goal.statement : "",
      successSignals: asArray(goal.successSignals)
    },
    impacts: synthesizeIds(asArray(productSpec.impacts), "IM"),
    deliverables: synthesizeIds(asArray(productSpec.deliverables), "DE"),
    userActivities: synthesizeIds(asArray(productSpec.userActivities), "UA"),
    epics: synthesizeIds(asArray(productSpec.epics), "EP"),
    agentBoundaries: {
      nonGoals: asArray(agentSpec.nonGoals),
      constraints: asArray(agentSpec.constraints),
      testExpectations: asArray(agentSpec.testExpectations),
      risks: asArray(agentSpec.qualityWarnings),
      openQuestions: asArray(agentSpec.openQuestions)
    }
  }

  const draft = normalizeDraft(candidate)
  return { schemaVersion: schemaVersionRaw, draft }
}
```

- [ ] **Step 4: 跑測試確認 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlParser.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/yamlParser.ts \
        src/features/spec-wizard/__tests__/yamlParser.test.ts
git commit -m "feat: [yaml-round-trip] yamlToDraft 反向映射至 FeatureDraft（#5）"
```

---

### Task 6: 全 fixture round-trip 不變式測試

**Files:**
- Create: `src/features/spec-wizard/__tests__/yamlRoundTrip.test.ts`

- [ ] **Step 1: 寫 round-trip 測試**

```ts
// src/features/spec-wizard/__tests__/yamlRoundTrip.test.ts
import { describe, expect, it } from "vitest"
import type { FeatureDraft } from "../model/specTypes"
import { draftToYaml } from "../services/yamlSerializer"
import { yamlToDraft } from "../services/yamlParser"
import {
  draftWithGwtAc,
  draftWithMeasurableSignal,
  draftWithRaid,
  draftWithRoadmap,
  minimalValidDraft
} from "../test/fixtures"

function roundTrip(draft: FeatureDraft): FeatureDraft {
  const yaml = draftToYaml(draft, "2026-04-29")
  return yamlToDraft(yaml).draft
}

describe("YAML round-trip", () => {
  it("minimalValidDraft → YAML → draft preserves metadata.title and locale", () => {
    const original = minimalValidDraft()
    const restored = roundTrip(original)
    expect(restored.metadata.title).toBe(original.metadata.title)
    expect(restored.metadata.locale).toBe(original.metadata.locale)
    expect(restored.metadata.owner).toBe(original.metadata.owner)
  })

  it("preserves goal.statement and at least one success signal", () => {
    const restored = roundTrip(minimalValidDraft())
    expect(restored.goal.statement).toBe("Help users understand what to do after a failed login.")
    expect(restored.goal.successSignals).toEqual([{ statement: "Support requests about failed login decrease" }])
  })

  it("preserves story id, title, userStory across round trip", () => {
    const restored = roundTrip(minimalValidDraft())
    const story = restored.epics[0].stories[0]
    expect(story.id).toBe("US-001")
    expect(story.title).toBe("Show a safe failed-login message")
    expect(story.userStory).toContain("As a member")
  })

  it("re-synthesizes impact / deliverable / userActivity / epic ids deterministically", () => {
    const restored = roundTrip(minimalValidDraft())
    expect(restored.impacts[0].id).toBe("IM-001")
    expect(restored.deliverables[0].id).toBe("DE-001")
    expect(restored.userActivities[0].id).toBe("UA-001")
    expect(restored.epics[0].id).toBe("EP-001")
  })

  it("preserves roadmap fields (id / horizon / priority / dependsOn)", () => {
    const restored = roundTrip(draftWithRoadmap())
    expect(restored.metadata.id).toBe("FT-001")
    expect(restored.metadata.horizon).toBe("now")
    expect(restored.metadata.priority).toBe("must")
    expect(restored.metadata.dependsOn).toEqual(["FT-002", "FT-005"])
  })

  it("preserves measurable success signal fields", () => {
    const restored = roundTrip(draftWithMeasurableSignal())
    expect(restored.goal.successSignals).toEqual([
      {
        statement: "Sign-up conversion rate improves by 15%",
        metric: "signup_completion_rate",
        threshold: "> 0.15",
        kind: "leading"
      }
    ])
  })

  it("preserves RAID structured entries (risks + openQuestions)", () => {
    const restored = roundTrip(draftWithRaid())
    expect(restored.agentBoundaries.risks).toEqual([
      {
        id: "R-001",
        text: "Token expiry edge case",
        status: "validating",
        mitigation: "Refresh quietly in background"
      },
      { id: "R-002", text: "Cold-start latency on serverless", status: "open" }
    ])
    expect(restored.agentBoundaries.openQuestions).toEqual([
      { id: "Q-001", text: "Should we support kiosk printing?", status: "open" }
    ])
  })

  it("preserves AC + GWT example shape", () => {
    const restored = roundTrip(draftWithGwtAc())
    expect(restored.epics[0].stories[0].acceptanceCriteria).toEqual([
      {
        id: "AC-001",
        statement: "Given the member enters a wrong password, when they submit, then the form shows a safe message."
      }
    ])
    expect(restored.epics[0].stories[0].examples[0].format).toBe("natural-language")
    expect(restored.epics[0].stories[0].examples[0].scenario).toBe("Wrong password three times in a row.")
  })

  it("does not leak export-only metadata.createdAt / metadata.status into the draft", () => {
    const restored = roundTrip(minimalValidDraft())
    expect((restored.metadata as Record<string, unknown>).createdAt).toBeUndefined()
    expect((restored.metadata as Record<string, unknown>).status).toBeUndefined()
  })

  it("zh-TW locale survives round trip even though YAML keys stay English", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "zh-TW"
    draft.metadata.title = "會員登入錯誤提示優化"
    const restored = roundTrip(draft)
    expect(restored.metadata.locale).toBe("zh-TW")
    expect(restored.metadata.title).toBe("會員登入錯誤提示優化")
  })
})
```

- [ ] **Step 2: 跑測試**

Run: `bunx vitest run src/features/spec-wizard/__tests__/yamlRoundTrip.test.ts`
Expected: 全部 PASS。如果失敗，回到 Task 5 修正映射或 normalizeDraft 預設值。

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/__tests__/yamlRoundTrip.test.ts
git commit -m "test: [yaml-round-trip] 全 fixture round-trip 不變式（#5）"
```

---

### Task 7: 在 draftStore 加 importDraftYaml action

**Files:**
- Modify: `src/features/spec-wizard/persistence/draftStore.ts`
- Modify: `src/features/spec-wizard/__tests__/draftStore.test.ts`

- [ ] **Step 1: 寫整合測試**

```ts
// 加進 draftStore.test.ts
// 確保檔頭已 import：
//   import { draftToYaml } from "../services/yamlSerializer"
//   import { minimalValidDraft } from "../test/fixtures"
//   import { createDraft, getSnapshot, importDraftYaml, __resetForTests } from "../persistence/draftStore"

describe("importDraftYaml", () => {
  beforeEach(() => {
    __resetForTests()
    localStorage.clear()
  })

  it("creates a new draft from an exported YAML string", () => {
    const originalId = createDraft("en")
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const newId = importDraftYaml(yaml)
    expect(newId).not.toBe(originalId)
    const snapshot = getSnapshot()
    expect(snapshot.activeDraftId).toBe(newId)
    expect(snapshot.drafts[newId].metadata.title).toBe("Login error message improvement")
  })

  it("propagates YamlParseError on malformed YAML", () => {
    expect(() => importDraftYaml("not yaml: [")).toThrow()
  })
})
```

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts -t "importDraftYaml"`
Expected: FAIL（找不到 export）。

- [ ] **Step 3: 實作 importDraftYaml**

```ts
// 加進 draftStore.ts，緊接既有 importDraftJson 之後

import { yamlToDraft } from "../services/yamlParser"

export function importDraftYaml(raw: string): string {
  const { draft } = yamlToDraft(raw)
  const current = ensureHydrated()
  const id = generateDraftId()
  const now = Date.now()
  setStateAndNotify({
    ...current,
    activeDraftId: id,
    drafts: { ...current.drafts, [id]: draft },
    meta: { ...current.meta, [id]: { createdAt: now, updatedAt: now } }
  })
  return id
}
```

- [ ] **Step 4: 跑測試確認 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: 全部 PASS（含原有測試）。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStore.ts \
        src/features/spec-wizard/__tests__/draftStore.test.ts
git commit -m "feat: [yaml-round-trip] draftStore 新增 importDraftYaml action（#5）"
```

---

### Task 8: 在 useDraftStore hook 暴露 importDraftYaml

**Files:**
- Modify: `src/features/spec-wizard/hooks/useDraftStore.ts`
- Modify: `src/features/spec-wizard/__tests__/useDraftStore.test.tsx`

- [ ] **Step 1: 加 hook 測試**

```ts
// 加進 useDraftStore.test.tsx（檔頭請補 import）
import { draftToYaml } from "../services/yamlSerializer"
import { minimalValidDraft } from "../test/fixtures"

it("exposes importDraftYaml that creates a draft from YAML", () => {
  const { result } = renderHook(() => useDraftStore())
  const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
  let newId = ""
  act(() => {
    newId = result.current.importDraftYaml(yaml)
  })
  expect(result.current.drafts.find((d) => d.id === newId)?.draft.metadata.title).toBe(
    "Login error message improvement"
  )
})
```

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/useDraftStore.test.tsx -t "importDraftYaml"`
Expected: FAIL（型別錯）。

- [ ] **Step 3: 在 hook 暴露**

```ts
// hooks/useDraftStore.ts —— 補在 import、UseDraftStoreValue、return value
import {
  // ...既有 imports
  importDraftYaml as importDraftYamlAction
} from "../persistence/draftStore"

export type UseDraftStoreValue = {
  // ...既有欄位
  importDraftYaml(raw: string): DraftId
}

// 在 return 物件補：
//   importDraftYaml: importDraftYamlAction
```

- [ ] **Step 4: 跑測試確認 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/useDraftStore.test.tsx`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/hooks/useDraftStore.ts \
        src/features/spec-wizard/__tests__/useDraftStore.test.tsx
git commit -m "feat: [yaml-round-trip] useDraftStore 暴露 importDraftYaml（#5）"
```

---

### Task 9: 補 i18n keys（4 條）

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`

- [ ] **Step 1: 在 MessageKey union 新增 4 條**

```ts
// messageKeys.ts —— 在 draftManager.* 區段尾端追加
  | "draftManager.importYaml"
  | "draftManager.importYamlError"
  | "draftManager.pasteYamlPlaceholder"
  | "draftManager.detectFormat"
```

- [ ] **Step 2: 在 zh-TW dictionary 新增**

```ts
// dictionaries.ts，"zh-TW" 物件中 draftManager.* 區塊
"draftManager.importYaml": "匯入 YAML",
"draftManager.importYamlError": "YAML 匯入失敗（第 {line} 行）：{reason}",
"draftManager.pasteYamlPlaceholder": "請在此貼上先前匯出的 YAML 規格...",
"draftManager.detectFormat": "自動偵測 JSON / YAML",
```

- [ ] **Step 3: 在 en dictionary 新增**

```ts
"draftManager.importYaml": "Import YAML",
"draftManager.importYamlError": "YAML import failed (line {line}): {reason}",
"draftManager.pasteYamlPlaceholder": "Paste a previously exported YAML spec here...",
"draftManager.detectFormat": "Auto-detect JSON / YAML",
```

- [ ] **Step 4: 跑型別檢查**

Run: `npx tsc --noEmit`
Expected: 0 errors。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/i18n/messageKeys.ts \
        src/features/spec-wizard/i18n/dictionaries.ts
git commit -m "feat: [yaml-round-trip] 新增 draftManager YAML 匯入 i18n keys（#5）"
```

---

### Task 10: DraftManagerModal 新增「匯入 YAML」按鈕 + paste 自動偵測

**Files:**
- Modify: `src/features/spec-wizard/components/DraftManagerModal.tsx`
- Modify: `src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx`

- [ ] **Step 1: 寫 UI flow 測試**

```tsx
// 加進 draftManagerModalFlow.test.tsx
// 在檔頭補：
//   import { draftToYaml } from "../services/yamlSerializer"
//   import { minimalValidDraft } from "../test/fixtures"

it("imports a draft from a YAML file via the import-YAML button", async () => {
  // 沿用既有 setup pattern；若有 helper renderModalOpen() 就用，沒有就照同檔他 it 樣板
  const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
  const file = new File([yaml], "feature.yaml", { type: "text/yaml" })
  const { user } = renderModalOpen()
  const input = screen.getByLabelText(/匯入 YAML|Import YAML/i) as HTMLInputElement
  await user.upload(input, file)
  expect(screen.getByText(/Login error message improvement/)).toBeInTheDocument()
})

it("paste textarea auto-detects YAML when content does not parse as JSON", async () => {
  const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
  const { user } = renderModalOpen()
  await user.click(screen.getByRole("button", { name: /直接貼上 JSON|Paste JSON directly/i }))
  const textarea = screen.getByPlaceholderText(/AI-generated JSON|Paste|YAML/i)
  await user.type(textarea, yaml)
  await user.click(screen.getByRole("button", { name: /確認匯入|Confirm Import/i }))
  expect(screen.getByText(/Login error message improvement/)).toBeInTheDocument()
})

it("shows YAML error toast with line number when YAML is malformed", async () => {
  const { user } = renderModalOpen()
  const file = new File(["not yaml: ["], "bad.yaml", { type: "text/yaml" })
  const input = screen.getByLabelText(/匯入 YAML|Import YAML/i) as HTMLInputElement
  await user.upload(input, file)
  expect(await screen.findByRole("alert")).toHaveTextContent(/line/i)
})
```

如果 `renderModalOpen` 不存在，請依檔案中既有的 setup 函式名稱套用。

- [ ] **Step 2: 跑測試確認 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 改 DraftManagerModal**

```tsx
// DraftManagerModal.tsx 變更要點：

// 1) 解構新增 importDraftYaml
const {
  drafts, createDraft, renameDraft, deleteDraft,
  importDraftJson, importDraftYaml, exportDraftJson
} = useDraftStore()

// 2) 加 import + state
import { YamlParseError } from "../services/yamlParser"
const [yamlImportError, setYamlImportError] = useState<{ line: number; reason: string } | null>(null)

// 3) 加 handleImportYaml
async function handleImportYaml(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    importDraftYaml(text)
    setYamlImportError(null)
    setImportError(null)
  } catch (err) {
    if (err instanceof YamlParseError) {
      setYamlImportError({ line: err.line, reason: err.message })
    } else {
      setYamlImportError({ line: 0, reason: (err as Error).message })
    }
  } finally {
    event.target.value = ""
  }
}

// 4) 加 tryImportText（paste 用，先 JSON 再 YAML）
function tryImportText(text: string): boolean {
  try {
    JSON.parse(text)
    importDraftJson(text)
    setImportError(null)
    setYamlImportError(null)
    return true
  } catch {
    // fall through to YAML
  }
  try {
    importDraftYaml(text)
    setImportError(null)
    setYamlImportError(null)
    return true
  } catch (err) {
    if (err instanceof YamlParseError) {
      setYamlImportError({ line: err.line, reason: err.message })
    } else {
      setImportError(t("draftManager.importError"))
    }
    return false
  }
}
```

JSX 新增（在現有「匯入」label 旁）：

```tsx
<label className="secondary-button" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
  {t("draftManager.importYaml")}
  <input
    type="file"
    accept=".yaml,.yml,text/yaml,text/plain"
    onChange={handleImportYaml}
    aria-label={t("draftManager.importYaml")}
    style={{ display: "none" }}
  />
</label>
```

把 paste 區塊裡兩處 `importDraftJson(target.value)` / `importDraftJson(textarea.value)` 替換為 `tryImportText(target.value)` / `tryImportText(textarea.value)`，且把 textarea 的 `placeholder` 改為 `t("draftManager.pasteYamlPlaceholder")`，在 textarea 上方加一行小字 `{t("draftManager.detectFormat")}`。

最後，在 `{importError && ...}` 區塊之後加：

```tsx
{yamlImportError && (
  <p role="alert" className="error" style={{ marginBottom: "1rem" }}>
    {t("draftManager.importYamlError")
      .replace("{line}", String(yamlImportError.line))
      .replace("{reason}", yamlImportError.reason)}
  </p>
)}
```

- [ ] **Step 4: 跑測試確認 PASS**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/DraftManagerModal.tsx \
        src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx
git commit -m "feat: [yaml-round-trip] DraftManager 支援 YAML 匯入與 paste 自動偵測（#5）"
```

---

### Task 11: 全套整合測試 + lint + build

**Files:** （不修改檔案，純驗證）

- [ ] **Step 1: 跑全部 vitest**

Run: `bun run test`
Expected: 0 failed。

- [ ] **Step 2: 跑 lint**

Run: `bun run lint`
Expected: 0 errors。

- [ ] **Step 3: 跑 typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors。

- [ ] **Step 4: 啟動 dev server，手動驗證一輪 round-trip**

Run: `bun run dev`，瀏覽器開 http://localhost:3000：
1. 完成一份草稿、按下「下載 YAML」
2. 把得到的 `.yaml` 檔案在 Draft Manager 用「匯入 YAML」拉回
3. 對照新 draft 的內容應與原 draft 完全一致（impact / deliverable / userActivity / epic 的 id 會被重新合成；story / AC / example / RAID id 應與原本相同）

如果有差異：回到 Task 5 校正映射，或 Task 4 修正 parser 邊界。

- [ ] **Step 5: 不需 commit（純驗證步驟）**

---

### Task 12: 文件更新

**Files:**
- Modify: `README.md`
- Modify: `README.zh-TW.md`
- Modify: `AGENTS.md`
- Modify: `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md`

- [ ] **Step 1: README 補 YAML 反向匯入用法**

在 `README.md` 既有 Draft Manager 段落後追加：

```md
### Re-importing a previously exported YAML

The Draft Manager also accepts YAML files exported from a previous session via
the **Import YAML** button (or by pasting YAML into the paste box — JSON / YAML
is auto-detected). The imported draft becomes a new entry; ids for impacts,
deliverables, user activities and epics are re-synthesized, while story /
acceptance-criterion / example / RAID ids are preserved verbatim. This closes
the inspect-adapt loop so you can iterate on the same feature spec across
sessions.
```

`README.zh-TW.md` 對應翻譯版本：

```md
### 重新匯入先前匯出的 YAML

Draft Manager 支援透過「匯入 YAML」按鈕載入先前匯出的 YAML 檔案，paste 區塊
也會自動偵測格式（JSON / YAML 任一）。匯入後會建立新的 draft；impact、
deliverable、userActivity、epic 的 id 會以索引重新合成，story / 驗收條件 /
範例 / RAID 的 id 則原樣保留。此功能閉合敏捷的 inspect-adapt 迴圈，讓同一份
feature spec 可以跨 session 繼續迭代。
```

- [ ] **Step 2: AGENTS.md 補上反向資料流**

把既有 `### Data flow` 區塊的箭頭圖（在「Architecture」段落內）改為：

```
React Wizard state (FeatureDraft)
  ├─ autosave → localStorage  (persistence/draftStorage.ts)
  ├─ POST /api/generate-spec  → normalizeDraftForExport → YAML string + summary + ValidationResult
  ├─ POST /api/assist          → assistService (rewrite | quality_check) → suggestion only, never mutates draft
  └─ Draft Manager import      → importDraftJson / importDraftYaml → normalizeDraft → new draft entry
```

並在 invariants 區塊新增一條：

> - **YAML 匯入經 normalizeDraft**：反向解析 (`yamlToDraft`) 必須走與 JSON 匯入相同的 `normalizeDraft()` 路徑，讓 legacy migration 不重複實作。

- [ ] **Step 3: gap-analysis 標 ✅**

把 `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md` 第 5 節標題從
「## 5. 缺少回饋迴圈（Inspect & Adapt）」改為
「## 5. 缺少回饋迴圈（Inspect & Adapt）✅ 部分實作 (2026-04-29)」，並在內文最上方加一段：

```md
### 實作說明 (2026-04-29)

**已實作**：YAML round-trip。Draft Manager 新增「匯入 YAML」按鈕與 paste 自動偵測；
新增 `services/yamlParser.ts`（純解析、無第三方依賴）與 `importDraftYaml` store
action；全 fixture round-trip 在 `__tests__/yamlRoundTrip.test.ts` 通過。
metadata.{createdAt,status} 為 export-only，匯入時剝除；impact / deliverable /
userActivity / epic 的 id 在反向時依索引重新合成。

**未實作（後續）**：YAML 內 `feedbackLog[]` 區塊。仍只是單向 PO → agent，
agent 端目前無法寫回。下一個迴圈再評估。

### 對應檔案
- `src/features/spec-wizard/services/yamlParser.ts`（新增）
- `src/features/spec-wizard/__tests__/{yamlParser,yamlRoundTrip}.test.ts`（新增）
- `src/features/spec-wizard/persistence/draftStore.ts`（`importDraftYaml`）
- `src/features/spec-wizard/hooks/useDraftStore.ts`（暴露 hook 欄位）
- `src/features/spec-wizard/components/DraftManagerModal.tsx`（YAML 按鈕 + paste auto-detect）
- `src/features/spec-wizard/i18n/{messageKeys,dictionaries}.ts`
- `README.md` / `README.zh-TW.md` / `AGENTS.md`
```

並在第 10 節「建議的 next step」表格把 `#5 YAML round-trip` 那一列改為：

```
| 6 | #5 YAML round-trip | services/yamlParser.ts | 中（投入較大） | ✅ 已實作 (2026-04-29) |
```

末段 narrative 把「下一個建議啟動的項目為 **#5 YAML round-trip**」改為「下一個建議啟動的項目為 **#7 effort 欄位**（粗估配合既有 horizon/priority/dependsOn 形成可視化 roadmap）」。

- [ ] **Step 4: 跑測試確保文件改動沒打斷任何快照**

Run: `bun run test && bun run lint`
Expected: 全綠。

- [ ] **Step 5: Commit**

```bash
git add README.md README.zh-TW.md AGENTS.md \
        docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md
git commit -m "docs: [yaml-round-trip] 標記 #5 已實作並補 README/AGENTS（#5）"
```

---

## Out of scope（明確不做）

- **`feedbackLog[]` 區塊**：spec 第 5 節列為 nice-to-have；單獨開 plan 評估。需要先想清楚 schema、與實作端 agent 的回寫機制、以及在 wizard 哪一步顯示。
- **YAML schemaVersion `0.3+` 處理**：保持「未知版號 → 拋 YamlParseError」的硬退路；之後若有版本演進，再加 migration adapter。
- **多檔批次 YAML 匯入**：CLI `vector-wizard import` 已負責多檔 JSON；YAML 多檔目前不在 PO 期望流程內，先不做。
- **YAML schema 驗證警告**：parser 只在結構級別丟錯，不再額外跑 INVEST/RAID 驗證——既有 wizard 開啟新 draft 時本來就會跑 `validation.ts`，重複執行會造成 toast 雜訊。
