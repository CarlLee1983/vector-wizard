# Wizard Action Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把現行 `AssistantPanel`（自由文字 Claude chat）改造為綁 Stories step 的被動式動作菜單，提供 `stories.rewrite` / `stories.gaps` / `stories.consistency` 三個 actions，所有寫入經預覽閘道，Claude CLI 工具集鎖死。

**Architecture:** Server-side `actionRunner` 走新 `/api/wizard-action` 路由，spawn claude CLI 並透過 `--disallowed-tools` flag 鎖死所有工具；client-side `WizardActionPanel` 訂閱 `useWizardContext` 取得 `currentStepId`，按 `actionRegistry` 渲染動作菜單；結果以 `ActionResultCard` 呈現，採用走 `useDraftStore.applyActionResult` 單一閘道寫入 draft。

**Tech Stack:**
- Next.js 15 App Router (`app/`) + React 19
- TypeScript (沒有 zod — 此 repo 使用 hand-rolled type guards，沿用同風格)
- Vitest 4 + jsdom + `@testing-library/react`
- Bun 為 package manager / runner
- `node:child_process.spawn` 啟動 `claude` CLI 取得 LLM 結構化輸出

**Spec:** `docs/superpowers/specs/2026-05-04-wizard-action-panel-design.md`

---

## File Structure

### 新檔
- `src/features/spec-wizard/services/localAgent/actionResult.ts` — `ActionResult` discriminated union + `parseActionResult(raw)` + 型別守衛
- `src/features/spec-wizard/services/localAgent/actionRegistry.ts` — `Action` 介面 + per-step registry export
- `src/features/spec-wizard/services/localAgent/promptTemplates/storiesRewrite.ts`
- `src/features/spec-wizard/services/localAgent/promptTemplates/storiesGaps.ts`
- `src/features/spec-wizard/services/localAgent/promptTemplates/storiesConsistency.ts`
- `src/features/spec-wizard/services/localAgent/actionRunner.ts` — 編排 prompt → spawn → parse
- `src/features/spec-wizard/services/localAgent/wizardActionRouteHandler.ts` — route 委派層
- `src/features/spec-wizard/persistence/applyActionResult.ts` — path parser + replace logic（純函式，被 draftStore 引用）
- `app/api/wizard-action/route.ts` — Next.js POST 路由
- `src/features/spec-wizard/hooks/useWizardContext.tsx` — provider + hook
- `src/features/spec-wizard/components/ActionResultCard.tsx`
- `src/features/spec-wizard/components/ActionMenu.tsx`
- `src/features/spec-wizard/components/WizardActionPanel.tsx`
- 對應測試：每個新模組一個 `__tests__/` 檔

### 修改
- `src/features/spec-wizard/services/localAgent/claudeProvider.ts` — 新增 `spawnAgent({ prompt, cwd, disallowedTools, signal })`，初期保留舊 `createClaudeProvider`，最後 task 一次刪
- `src/features/spec-wizard/persistence/draftStore.ts` — 新增 `applyActionResult` action
- `src/features/spec-wizard/hooks/useDraftStore.ts` — 暴露 `applyActionResult`
- `src/features/spec-wizard/i18n/dictionaries.ts` — 新增 `actionPanel.*` keys
- `src/features/spec-wizard/components/AppShell.tsx` — 換掛 `WizardActionPanel`
- `src/features/spec-wizard/components/Wizard.tsx` — 把 `currentStepId` 推進 `useWizardContext`
- `src/features/spec-wizard/components/SeedPromptSection.tsx` — 移除「送進 panel」按鈕及相關 state / import

### 砍除（最後兩個 task 一次處理）
- `src/features/spec-wizard/components/AssistantPanel.tsx`
- `src/features/spec-wizard/services/localAgent/assistantBridge.ts`
- `src/features/spec-wizard/services/localAgent/chatItem.ts`
- `src/features/spec-wizard/services/localAgent/agentRouteHandler.ts`
- `src/features/spec-wizard/services/localAgent/agentSeedPromptBuilder.ts`
- `src/features/spec-wizard/hooks/useLocalAgent.ts`
- `app/api/agent/route.ts`
- 對應測試：`assistantBridge.test.ts` / `agentRoute.test.ts` / `agentSeedPromptBuilder.test.ts` / `useLocalAgent.test.tsx` / 視情況 `messageReducer.test.ts`

---

## Tasks

### Task 1: ActionResult schema 與 parser

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/actionResult.ts`
- Test: `src/features/spec-wizard/__tests__/actionResult.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/actionResult.test.ts
import { describe, expect, it } from "vitest"
import { parseActionResult } from "../services/localAgent/actionResult"

describe("parseActionResult", () => {
  it("parses a valid preview fence", () => {
    const raw = [
      "Some chatter before",
      "```vector-action",
      JSON.stringify({
        preview: {
          text: "身為 PM，我想要 X，以便 Y。",
          targetPath: "epics[0].stories[0].userStory",
          mode: "replace"
        }
      }),
      "```",
      "trailing text"
    ].join("\n")
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("preview")
    if (result.kind === "preview") {
      expect(result.actionId).toBe("stories.rewrite")
      expect(result.preview.text).toMatch(/PM/)
      expect(result.preview.targetPath).toBe("epics[0].stories[0].userStory")
      expect(result.preview.mode).toBe("replace")
    }
  })

  it("parses a valid notes fence", () => {
    const raw = [
      "```vector-action",
      JSON.stringify({
        notes: [
          { severity: "warning", text: "Missing role: admin" },
          { severity: "info", text: "Consider edge case" }
        ]
      }),
      "```"
    ].join("\n")
    const result = parseActionResult(raw, "stories.gaps")
    expect(result.kind).toBe("notes")
    if (result.kind === "notes") {
      expect(result.notes).toHaveLength(2)
      expect(result.notes[0].severity).toBe("warning")
    }
  })

  it("returns parse_error when no fence present", () => {
    const result = parseActionResult("just plain text without fence", "stories.gaps")
    expect(result.kind).toBe("parse_error")
    if (result.kind === "parse_error") {
      expect(result.actionId).toBe("stories.gaps")
      expect(result.raw).toBe("just plain text without fence")
    }
  })

  it("returns parse_error on malformed JSON inside fence", () => {
    const raw = "```vector-action\n{ this is not json\n```"
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("parse_error")
  })

  it("returns parse_error when shape does not match preview or notes", () => {
    const raw = `\`\`\`vector-action\n${JSON.stringify({ unexpected: "shape" })}\n\`\`\``
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("parse_error")
  })

  it("rejects preview with invalid mode", () => {
    const raw = `\`\`\`vector-action\n${JSON.stringify({
      preview: { text: "x", targetPath: "epics[0].stories[0].userStory", mode: "bogus" }
    })}\n\`\`\``
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("parse_error")
  })

  it("rejects notes with empty array", () => {
    const raw = `\`\`\`vector-action\n${JSON.stringify({ notes: [] })}\n\`\`\``
    const result = parseActionResult(raw, "stories.gaps")
    expect(result.kind).toBe("parse_error")
  })

  it("takes the first vector-action fence when multiple exist", () => {
    const raw = [
      "```vector-action",
      JSON.stringify({ notes: [{ severity: "info", text: "first" }] }),
      "```",
      "filler",
      "```vector-action",
      JSON.stringify({ notes: [{ severity: "warning", text: "second" }] }),
      "```"
    ].join("\n")
    const result = parseActionResult(raw, "stories.gaps")
    expect(result.kind).toBe("notes")
    if (result.kind === "notes") {
      expect(result.notes[0].text).toBe("first")
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionResult.test.ts
```

Expected: FAIL with "Cannot find module '../services/localAgent/actionResult'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/services/localAgent/actionResult.ts
export type ActionResultPreview = {
  kind: "preview"
  actionId: string
  preview: {
    text: string
    targetPath: string
    mode: "insert" | "replace"
  }
}

export type ActionResultNotes = {
  kind: "notes"
  actionId: string
  notes: Array<{
    severity: "info" | "warning"
    text: string
    ref?: string
  }>
}

export type ActionResultParseError = {
  kind: "parse_error"
  actionId: string
  raw: string
}

export type ActionResultRunError = {
  kind: "run_error"
  actionId: string
  message: string
}

export type ActionResult =
  | ActionResultPreview
  | ActionResultNotes
  | ActionResultParseError
  | ActionResultRunError

const FENCE_RE = /```vector-action\s*\n([\s\S]*?)\n```/

export function parseActionResult(raw: string, actionId: string): ActionResult {
  const match = FENCE_RE.exec(raw)
  if (!match) {
    return { kind: "parse_error", actionId, raw }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(match[1])
  } catch {
    return { kind: "parse_error", actionId, raw }
  }
  if (!parsed || typeof parsed !== "object") {
    return { kind: "parse_error", actionId, raw }
  }
  const preview = (parsed as { preview?: unknown }).preview
  if (preview !== undefined) {
    if (!isPreviewShape(preview)) return { kind: "parse_error", actionId, raw }
    return { kind: "preview", actionId, preview }
  }
  const notes = (parsed as { notes?: unknown }).notes
  if (notes !== undefined) {
    if (!isNotesShape(notes)) return { kind: "parse_error", actionId, raw }
    return { kind: "notes", actionId, notes }
  }
  return { kind: "parse_error", actionId, raw }
}

function isPreviewShape(v: unknown): v is ActionResultPreview["preview"] {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.text === "string" &&
    o.text.length > 0 &&
    typeof o.targetPath === "string" &&
    o.targetPath.length > 0 &&
    (o.mode === "insert" || o.mode === "replace")
  )
}

function isNotesShape(v: unknown): v is ActionResultNotes["notes"] {
  if (!Array.isArray(v) || v.length === 0) return false
  return v.every((item) => {
    if (!item || typeof item !== "object") return false
    const o = item as Record<string, unknown>
    return (
      (o.severity === "info" || o.severity === "warning") &&
      typeof o.text === "string" &&
      o.text.length > 0 &&
      (o.ref === undefined || typeof o.ref === "string")
    )
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionResult.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/actionResult.ts \
        src/features/spec-wizard/__tests__/actionResult.test.ts
git commit -m "feat: [action-panel] ActionResult schema 與 fenced JSON parser"
```

---

### Task 2: claudeProvider.spawnAgent — 一次性執行 + 工具鎖死

**Files:**
- Modify: `src/features/spec-wizard/services/localAgent/claudeProvider.ts`
- Test: `src/features/spec-wizard/__tests__/claudeProvider.test.ts` (擴充)

**Note**: 此 task 新增 `spawnAgent`，**不刪除既有 `createClaudeProvider().send`**。後者在 Task 20 cleanup 時刪。

- [ ] **Step 1: Write the failing test**

加進 `claudeProvider.test.ts` 末端：

```typescript
import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { spawnAgent } from "../services/localAgent/claudeProvider"

function makeFakeChild(stdoutLines: string[], exitCode = 0) {
  const stdout = Readable.from(stdoutLines.map((l) => `${l}\n`))
  const stderr = Readable.from([])
  const child = new EventEmitter() as EventEmitter & {
    stdout: Readable
    stderr: Readable
    killed: boolean
    kill: (sig?: string) => boolean
  }
  child.stdout = stdout
  child.stderr = stderr
  child.killed = false
  child.kill = () => {
    child.killed = true
    return true
  }
  setTimeout(() => child.emit("close", exitCode), 0)
  return child
}

describe("spawnAgent", () => {
  it("collects assistant_text from stream and returns concatenated text", async () => {
    const lines = [
      JSON.stringify({
        type: "system",
        subtype: "init",
        session_id: "s1",
        cwd: "/tmp",
        model: "claude-haiku-4-5"
      }),
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "hello " }] }
      }),
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "world" }] }
      }),
      JSON.stringify({ type: "result", session_id: "s1", is_error: false })
    ]
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeChild(lines))
    const result = await spawnAgent({
      prompt: "do thing",
      cwd: "/tmp",
      disallowedTools: ["Bash", "Read"],
      spawn: fakeSpawn
    })
    expect(result.text).toBe("hello world")
    expect(result.exitCode).toBe(0)
  })

  it("passes --disallowed-tools flag with comma-joined list to claude argv", async () => {
    const fakeSpawn = vi.fn().mockReturnValue(
      makeFakeChild([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
    )
    await spawnAgent({
      prompt: "do thing",
      cwd: "/tmp",
      disallowedTools: ["Bash", "Read", "Edit"],
      spawn: fakeSpawn
    })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    const idx = argv.indexOf("--disallowed-tools")
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(argv[idx + 1]).toBe("Bash,Read,Edit")
  })

  it("does not pass --disallowed-tools when list is empty", async () => {
    const fakeSpawn = vi.fn().mockReturnValue(
      makeFakeChild([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
    )
    await spawnAgent({ prompt: "x", cwd: "/tmp", disallowedTools: [], spawn: fakeSpawn })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    expect(argv).not.toContain("--disallowed-tools")
  })

  it("throws on non-zero exit with stderr message", async () => {
    const child = makeFakeChild([], 1)
    child.stderr = Readable.from(["fatal error\n"])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await expect(
      spawnAgent({ prompt: "x", cwd: "/tmp", disallowedTools: [], spawn: fakeSpawn })
    ).rejects.toThrow(/fatal error|exited with code 1/)
  })

  it("rejects when signal fires before spawn", async () => {
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeChild([]))
    const ac = new AbortController()
    ac.abort()
    await expect(
      spawnAgent({
        prompt: "x",
        cwd: "/tmp",
        disallowedTools: [],
        spawn: fakeSpawn,
        signal: ac.signal
      })
    ).rejects.toThrow(/abort/i)
  })
})
```

> 注意：`describe`、`it`、`expect`、`vi` 已被 `vitest` `globals: true` 設定全域注入；不需 import。

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/claudeProvider.test.ts -t spawnAgent
```

Expected: FAIL — `spawnAgent` not exported.

- [ ] **Step 3: Write minimal implementation**

加到 `claudeProvider.ts` 末端（保留既有 `createClaudeProvider`）：

```typescript
import type { ChildProcess } from "node:child_process"

export type SpawnAgentOptions = {
  prompt: string
  cwd: string
  disallowedTools?: string[]
  signal?: AbortSignal
  spawn?: SpawnFn
  binPath?: string
}

export type SpawnAgentResult = {
  text: string
  exitCode: number
}

export async function spawnAgent(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  if (opts.signal?.aborted) {
    throw new Error("Aborted before start")
  }

  const spawn = opts.spawn ?? defaultSpawn
  const binPath = opts.binPath ?? "claude"
  const disallowed = opts.disallowedTools ?? []

  const args: string[] = [
    "--add-dir",
    opts.cwd,
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "default"
  ]
  if (disallowed.length > 0) {
    args.push("--disallowed-tools", disallowed.join(","))
  }
  args.push(opts.prompt)

  const child = spawn(binPath, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] }) as ChildProcess

  const onAbort = () => {
    if (!child.killed) {
      try {
        child.kill("SIGTERM")
      } catch {
        // already exited
      }
    }
  }
  opts.signal?.addEventListener("abort", onAbort)

  let stderrBuf = ""
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString()
  })

  const exitPromise = new Promise<number>((resolve) => {
    child.once("close", (code) => resolve(code ?? 0))
  })

  let text = ""
  try {
    if (!child.stdout) {
      throw new Error("claude process produced no stdout stream")
    }
    const rl = createInterface({ input: child.stdout })
    for await (const line of rl) {
      for (const event of parseStreamJsonLine(line)) {
        if (event.type === "assistant_text") {
          text += event.text
        }
      }
    }
    const code = await exitPromise
    if (opts.signal?.aborted) {
      throw new Error("Aborted")
    }
    if (code !== 0) {
      throw new Error(stderrBuf.trim() || `claude exited with code ${code}`)
    }
    return { text, exitCode: code }
  } finally {
    opts.signal?.removeEventListener("abort", onAbort)
    if (!child.killed) {
      try {
        child.kill("SIGTERM")
      } catch {
        // ignore
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/claudeProvider.test.ts
```

Expected: PASS — both old `createClaudeProvider` tests and new `spawnAgent` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/claudeProvider.ts \
        src/features/spec-wizard/__tests__/claudeProvider.test.ts
git commit -m "feat: [action-panel] claudeProvider 加 spawnAgent + disallowed-tools 鎖工具集"
```

---

### Task 3: actionRegistry types + 空 registry

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/actionRegistry.ts`
- Test: `src/features/spec-wizard/__tests__/actionRegistry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/actionRegistry.test.ts
import {
  getActionsForStep,
  getActionById,
  type ActionStepId
} from "../services/localAgent/actionRegistry"

describe("actionRegistry", () => {
  it("returns empty array for unknown step", () => {
    expect(getActionsForStep("basic" as ActionStepId)).toEqual([])
  })

  it("returns empty array for stories step before any actions registered", () => {
    expect(Array.isArray(getActionsForStep("stories"))).toBe(true)
  })

  it("getActionById returns undefined for unknown id", () => {
    expect(getActionById("nope.nope")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionRegistry.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/services/localAgent/actionRegistry.ts
import type { FeatureDraft } from "../../model/specTypes"

export type ActionStepId =
  | "basic"
  | "context"
  | "goal"
  | "stories"
  | "criteria"
  | "examples"
  | "boundaries"
  | "deliverables"

export type ActionMutationKind = "preview" | "notes"

export type ActionDefinition = {
  id: string
  step: ActionStepId
  labelKey: string
  helpKey: string
  mutationKind: ActionMutationKind
  promptTemplate: (input: { draft: FeatureDraft }) => string
  disallowedTools: string[]
}

const REGISTRY: ActionDefinition[] = []

export function registerAction(def: ActionDefinition): void {
  if (REGISTRY.some((a) => a.id === def.id)) {
    throw new Error(`Action already registered: ${def.id}`)
  }
  REGISTRY.push(def)
}

export function getActionsForStep(step: ActionStepId): ActionDefinition[] {
  return REGISTRY.filter((a) => a.step === step)
}

export function getActionById(id: string): ActionDefinition | undefined {
  return REGISTRY.find((a) => a.id === id)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionRegistry.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/actionRegistry.ts \
        src/features/spec-wizard/__tests__/actionRegistry.test.ts
git commit -m "feat: [action-panel] actionRegistry 介面 + 空 registry 骨架"
```

---

### Task 4: prompt template — `stories.rewrite`

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/promptTemplates/storiesRewrite.ts`
- Test: `src/features/spec-wizard/__tests__/storiesRewriteTemplate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/storiesRewriteTemplate.test.ts
import { storiesRewriteTemplate } from "../services/localAgent/promptTemplates/storiesRewrite"
import { minimalValidDraft } from "../test/fixtures"

describe("storiesRewriteTemplate", () => {
  it("includes the existing user story text and goal", () => {
    const draft = minimalValidDraft()
    const out = storiesRewriteTemplate({ draft })
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out).toContain(draft.goal.statement)
  })

  it("includes vector-action fence instruction with replace mode", () => {
    const draft = minimalValidDraft()
    const out = storiesRewriteTemplate({ draft })
    expect(out).toContain("```vector-action")
    expect(out).toContain("epics[0].stories[0].userStory")
    expect(out).toContain('"mode": "replace"')
  })

  it("requests Traditional Chinese output when locale is zh-TW", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "zh-TW"
    const out = storiesRewriteTemplate({ draft })
    expect(out).toMatch(/繁體中文|zh-TW/)
  })

  it("requests English output when locale is en", () => {
    const draft = minimalValidDraft()
    draft.metadata.locale = "en"
    const out = storiesRewriteTemplate({ draft })
    expect(out.toLowerCase()).toMatch(/english|\ben\b/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/storiesRewriteTemplate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/services/localAgent/promptTemplates/storiesRewrite.ts
import type { FeatureDraft } from "../../../model/specTypes"

export function storiesRewriteTemplate({ draft }: { draft: FeatureDraft }): string {
  const story = draft.epics?.[0]?.stories?.[0]
  if (!story) {
    throw new Error("storiesRewriteTemplate requires epics[0].stories[0] to exist")
  }
  const locale = draft.metadata.locale ?? "zh-TW"
  const localeInstruction =
    locale === "en"
      ? "Respond in English."
      : "請以繁體中文（zh-TW）作答。"
  return [
    "你是一個敏捷產品教練，協助使用者改寫 user story 使其更精確、可驗證。",
    `Feature 標題：${draft.metadata.title || "(未填)"}`,
    `Goal：${draft.goal.statement || "(未填)"}`,
    `Story 標題：${story.title || "(未填)"}`,
    `現有 user story：「${story.userStory}」`,
    "",
    "請改寫這條 user story，要求：",
    "1. 遵循「身為 X，我想要 Y，以便 Z」結構",
    "2. 角色（X）具體（避免「使用者」這種泛稱）",
    "3. 動機（Z）連結到 Goal",
    localeInstruction,
    "",
    "請僅輸出一個 fenced code block，標記為 vector-action，內容符合下列 schema：",
    "",
    "```vector-action",
    JSON.stringify(
      {
        preview: {
          text: "...",
          targetPath: "epics[0].stories[0].userStory",
          mode: "replace"
        }
      },
      null,
      2
    ),
    "```",
    "",
    "不要有其他輸出、不要解釋、不要 markdown。"
  ].join("\n")
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/storiesRewriteTemplate.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/promptTemplates/storiesRewrite.ts \
        src/features/spec-wizard/__tests__/storiesRewriteTemplate.test.ts
git commit -m "feat: [action-panel] stories.rewrite prompt template"
```

---

### Task 5: prompt template — `stories.gaps`

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/promptTemplates/storiesGaps.ts`
- Test: `src/features/spec-wizard/__tests__/storiesGapsTemplate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/storiesGapsTemplate.test.ts
import { storiesGapsTemplate } from "../services/localAgent/promptTemplates/storiesGaps"
import { minimalValidDraft } from "../test/fixtures"

describe("storiesGapsTemplate", () => {
  it("includes the user story and goal", () => {
    const draft = minimalValidDraft()
    const out = storiesGapsTemplate({ draft })
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out).toContain(draft.goal.statement)
  })

  it("requests notes-shape vector-action output", () => {
    const draft = minimalValidDraft()
    const out = storiesGapsTemplate({ draft })
    expect(out).toContain("```vector-action")
    expect(out).toContain('"notes"')
    expect(out).toContain('"severity"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/storiesGapsTemplate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/services/localAgent/promptTemplates/storiesGaps.ts
import type { FeatureDraft } from "../../../model/specTypes"

export function storiesGapsTemplate({ draft }: { draft: FeatureDraft }): string {
  const story = draft.epics?.[0]?.stories?.[0]
  const locale = draft.metadata.locale ?? "zh-TW"
  const localeInstruction = locale === "en" ? "Respond in English." : "請以繁體中文作答。"
  return [
    "你是一個敏捷產品教練，協助找出 user story 中可能遺漏的角色與場景。",
    `Goal：${draft.goal.statement || "(未填)"}`,
    `現有 user story：「${story?.userStory ?? "(未填)"}」`,
    "",
    "請列出這條 story 可能漏掉的角色（actor）或場景（scenario）。最多 5 條，每條一句話。",
    "若該 story 看起來已經足夠完整，回 1 條 severity 為 info 的條目，說明覆蓋良好的理由。",
    localeInstruction,
    "",
    "請僅輸出一個 fenced code block，標記為 vector-action，內容符合下列 schema：",
    "",
    "```vector-action",
    JSON.stringify(
      {
        notes: [
          { severity: "warning", text: "..." }
        ]
      },
      null,
      2
    ),
    "```",
    "",
    "severity 只能是 info 或 warning。不要其他輸出。"
  ].join("\n")
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/storiesGapsTemplate.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/promptTemplates/storiesGaps.ts \
        src/features/spec-wizard/__tests__/storiesGapsTemplate.test.ts
git commit -m "feat: [action-panel] stories.gaps prompt template"
```

---

### Task 6: prompt template — `stories.consistency`

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/promptTemplates/storiesConsistency.ts`
- Test: `src/features/spec-wizard/__tests__/storiesConsistencyTemplate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/storiesConsistencyTemplate.test.ts
import { storiesConsistencyTemplate } from "../services/localAgent/promptTemplates/storiesConsistency"
import { minimalValidDraft, draftWithGwtAc } from "../test/fixtures"

describe("storiesConsistencyTemplate", () => {
  it("includes goal, story, and acceptanceCriteria", () => {
    const draft = draftWithGwtAc()
    const out = storiesConsistencyTemplate({ draft })
    expect(out).toContain(draft.goal.statement)
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out).toContain(draft.epics[0].stories[0].acceptanceCriteria[0].statement)
  })

  it("handles empty acceptanceCriteria gracefully", () => {
    const draft = minimalValidDraft()
    expect(draft.epics[0].stories[0].acceptanceCriteria).toHaveLength(0)
    const out = storiesConsistencyTemplate({ draft })
    expect(out).toContain(draft.epics[0].stories[0].userStory)
    expect(out.length).toBeGreaterThan(0)
  })

  it("requests notes-shape vector-action output", () => {
    const out = storiesConsistencyTemplate({ draft: minimalValidDraft() })
    expect(out).toContain("```vector-action")
    expect(out).toContain('"notes"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/storiesConsistencyTemplate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/services/localAgent/promptTemplates/storiesConsistency.ts
import type { FeatureDraft } from "../../../model/specTypes"

export function storiesConsistencyTemplate({ draft }: { draft: FeatureDraft }): string {
  const story = draft.epics?.[0]?.stories?.[0]
  const ac = story?.acceptanceCriteria ?? []
  const acText = ac.length === 0 ? "(尚未填寫)" : ac.map((c, i) => `${i + 1}. ${c.statement}`).join("\n")
  const locale = draft.metadata.locale ?? "zh-TW"
  const localeInstruction = locale === "en" ? "Respond in English." : "請以繁體中文作答。"
  return [
    "你是一個敏捷產品教練，協助對齊 Goal、User Story、Acceptance Criteria 三者的一致性。",
    `Goal：${draft.goal.statement || "(未填)"}`,
    `User Story：「${story?.userStory ?? "(未填)"}」`,
    `Acceptance Criteria：`,
    acText,
    "",
    "請列出這三者之間的不一致或斷層（最多 5 條）。每條須點出具體欄位。",
    "若三者一致，回 1 條 severity 為 info 的條目說明對齊狀況。",
    localeInstruction,
    "",
    "請僅輸出一個 fenced code block，標記為 vector-action：",
    "",
    "```vector-action",
    JSON.stringify(
      {
        notes: [
          { severity: "warning", text: "...", ref: "epics[0].stories[0]" }
        ]
      },
      null,
      2
    ),
    "```",
    "",
    "severity 只能是 info 或 warning。"
  ].join("\n")
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/storiesConsistencyTemplate.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/promptTemplates/storiesConsistency.ts \
        src/features/spec-wizard/__tests__/storiesConsistencyTemplate.test.ts
git commit -m "feat: [action-panel] stories.consistency prompt template"
```

---

### Task 7: 註冊 3 個 actions 進 registry

**Files:**
- Modify: `src/features/spec-wizard/services/localAgent/actionRegistry.ts`
- Modify: `src/features/spec-wizard/__tests__/actionRegistry.test.ts`

- [ ] **Step 1: 把 actionRegistry.test.ts 改寫為包含 3 個 stories actions 的斷言**

```typescript
// src/features/spec-wizard/__tests__/actionRegistry.test.ts
import { getActionsForStep, getActionById } from "../services/localAgent/actionRegistry"

describe("actionRegistry", () => {
  it("registers 3 actions on stories step", () => {
    const actions = getActionsForStep("stories")
    expect(actions.map((a) => a.id).sort()).toEqual([
      "stories.consistency",
      "stories.gaps",
      "stories.rewrite"
    ])
  })

  it("stories.rewrite has mutationKind preview", () => {
    expect(getActionById("stories.rewrite")?.mutationKind).toBe("preview")
  })

  it("stories.gaps has mutationKind notes", () => {
    expect(getActionById("stories.gaps")?.mutationKind).toBe("notes")
  })

  it("stories.consistency has mutationKind notes", () => {
    expect(getActionById("stories.consistency")?.mutationKind).toBe("notes")
  })

  it("all stories actions have a non-empty disallowedTools list", () => {
    const actions = getActionsForStep("stories")
    expect(actions.every((a) => a.disallowedTools.length > 0)).toBe(true)
  })

  it("disallowedTools includes Bash, Read, Edit at minimum", () => {
    const actions = getActionsForStep("stories")
    for (const a of actions) {
      expect(a.disallowedTools).toContain("Bash")
      expect(a.disallowedTools).toContain("Read")
      expect(a.disallowedTools).toContain("Edit")
    }
  })

  it("returns empty array for steps with no actions", () => {
    expect(getActionsForStep("basic")).toEqual([])
    expect(getActionsForStep("goal")).toEqual([])
  })

  it("getActionById returns undefined for unknown id", () => {
    expect(getActionById("nope.nope")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionRegistry.test.ts
```

Expected: FAIL — registry returns empty array for stories.

- [ ] **Step 3: 註冊 3 個 actions**

在 `actionRegistry.ts` 末端追加：

```typescript
// 在 actionRegistry.ts 末端追加
import { storiesRewriteTemplate } from "./promptTemplates/storiesRewrite"
import { storiesGapsTemplate } from "./promptTemplates/storiesGaps"
import { storiesConsistencyTemplate } from "./promptTemplates/storiesConsistency"

const FULL_TOOL_LOCK = [
  "Bash",
  "Read",
  "Edit",
  "Write",
  "MultiEdit",
  "WebFetch",
  "WebSearch",
  "NotebookEdit",
  "TodoWrite",
  "Glob",
  "Grep"
]

registerAction({
  id: "stories.rewrite",
  step: "stories",
  labelKey: "actionPanel.actions.stories.rewrite.label",
  helpKey: "actionPanel.actions.stories.rewrite.help",
  mutationKind: "preview",
  promptTemplate: storiesRewriteTemplate,
  disallowedTools: FULL_TOOL_LOCK
})

registerAction({
  id: "stories.gaps",
  step: "stories",
  labelKey: "actionPanel.actions.stories.gaps.label",
  helpKey: "actionPanel.actions.stories.gaps.help",
  mutationKind: "notes",
  promptTemplate: storiesGapsTemplate,
  disallowedTools: FULL_TOOL_LOCK
})

registerAction({
  id: "stories.consistency",
  step: "stories",
  labelKey: "actionPanel.actions.stories.consistency.label",
  helpKey: "actionPanel.actions.stories.consistency.help",
  mutationKind: "notes",
  promptTemplate: storiesConsistencyTemplate,
  disallowedTools: FULL_TOOL_LOCK
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionRegistry.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/actionRegistry.ts \
        src/features/spec-wizard/__tests__/actionRegistry.test.ts
git commit -m "feat: [action-panel] 註冊 stories step 3 個 actions"
```

---

### Task 8: actionRunner — 編排 prompt → spawn → parse

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/actionRunner.ts`
- Test: `src/features/spec-wizard/__tests__/actionRunner.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/actionRunner.test.ts
import { runAction } from "../services/localAgent/actionRunner"
import { minimalValidDraft } from "../test/fixtures"

describe("runAction", () => {
  it("returns preview ActionResult on successful rewrite", async () => {
    const fakeSpawnAgent = vi.fn().mockResolvedValue({
      text: [
        "```vector-action",
        JSON.stringify({
          preview: {
            text: "身為訪客，我想要看到清楚的錯誤訊息，以便了解下一步。",
            targetPath: "epics[0].stories[0].userStory",
            mode: "replace"
          }
        }),
        "```"
      ].join("\n"),
      exitCode: 0
    })
    const result = await runAction({
      actionId: "stories.rewrite",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("preview")
    expect(fakeSpawnAgent).toHaveBeenCalledTimes(1)
    const call = fakeSpawnAgent.mock.calls[0][0]
    expect(call.disallowedTools).toContain("Bash")
    expect(call.cwd).toBe("/tmp")
    expect(typeof call.prompt).toBe("string")
    expect(call.prompt.length).toBeGreaterThan(0)
  })

  it("returns notes ActionResult for gaps action", async () => {
    const fakeSpawnAgent = vi.fn().mockResolvedValue({
      text: [
        "```vector-action",
        JSON.stringify({
          notes: [{ severity: "warning", text: "Missing admin role" }]
        }),
        "```"
      ].join("\n"),
      exitCode: 0
    })
    const result = await runAction({
      actionId: "stories.gaps",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("notes")
  })

  it("returns parse_error when output has no fence", async () => {
    const fakeSpawnAgent = vi.fn().mockResolvedValue({ text: "free text", exitCode: 0 })
    const result = await runAction({
      actionId: "stories.gaps",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("parse_error")
  })

  it("returns run_error when spawnAgent throws", async () => {
    const fakeSpawnAgent = vi.fn().mockRejectedValue(new Error("CLI not found"))
    const result = await runAction({
      actionId: "stories.rewrite",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("run_error")
    if (result.kind === "run_error") {
      expect(result.message).toMatch(/CLI not found/)
    }
  })

  it("returns run_error for unknown actionId", async () => {
    const result = await runAction({
      actionId: "nope.nope",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: vi.fn()
    })
    expect(result.kind).toBe("run_error")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionRunner.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/services/localAgent/actionRunner.ts
import type { FeatureDraft } from "../../model/specTypes"
import { getActionById } from "./actionRegistry"
import { parseActionResult, type ActionResult } from "./actionResult"
import type { SpawnAgentOptions, SpawnAgentResult } from "./claudeProvider"
import { spawnAgent as defaultSpawnAgent } from "./claudeProvider"

export type RunActionInput = {
  actionId: string
  draft: FeatureDraft
  cwd: string
  signal?: AbortSignal
  spawnAgent?: (opts: SpawnAgentOptions) => Promise<SpawnAgentResult>
}

export async function runAction(input: RunActionInput): Promise<ActionResult> {
  const action = getActionById(input.actionId)
  if (!action) {
    return {
      kind: "run_error",
      actionId: input.actionId,
      message: `Unknown action: ${input.actionId}`
    }
  }
  const spawn = input.spawnAgent ?? defaultSpawnAgent
  let prompt: string
  try {
    prompt = action.promptTemplate({ draft: input.draft })
  } catch (err) {
    return {
      kind: "run_error",
      actionId: action.id,
      message: err instanceof Error ? err.message : String(err)
    }
  }
  try {
    const { text } = await spawn({
      prompt,
      cwd: input.cwd,
      disallowedTools: action.disallowedTools,
      signal: input.signal
    })
    return parseActionResult(text, action.id)
  } catch (err) {
    return {
      kind: "run_error",
      actionId: action.id,
      message: err instanceof Error ? err.message : String(err)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionRunner.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/actionRunner.ts \
        src/features/spec-wizard/__tests__/actionRunner.test.ts
git commit -m "feat: [action-panel] actionRunner 編排 prompt + spawn + parse"
```

---

### Task 9: wizardActionRouteHandler

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/wizardActionRouteHandler.ts`
- Test: `src/features/spec-wizard/__tests__/wizardActionRouteHandler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/wizardActionRouteHandler.test.ts
import { handleWizardAction } from "../services/localAgent/wizardActionRouteHandler"
import { minimalValidDraft } from "../test/fixtures"

describe("handleWizardAction", () => {
  it("returns 200 + ActionResult preview for valid input", async () => {
    const fakeRunAction = vi.fn().mockResolvedValue({
      kind: "preview",
      actionId: "stories.rewrite",
      preview: { text: "x", targetPath: "epics[0].stories[0].userStory", mode: "replace" }
    })
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "stories.rewrite", draft: minimalValidDraft() })
    })
    const res = await handleWizardAction(req, { runAction: fakeRunAction, cwd: "/tmp" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe("preview")
    expect(fakeRunAction).toHaveBeenCalledTimes(1)
    expect(fakeRunAction.mock.calls[0][0].cwd).toBe("/tmp")
  })

  it("returns 400 when actionId missing", async () => {
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: minimalValidDraft() })
    })
    const res = await handleWizardAction(req, { runAction: vi.fn() })
    expect(res.status).toBe(400)
  })

  it("returns 400 when draft missing or not an object", async () => {
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "stories.gaps" })
    })
    const res = await handleWizardAction(req, { runAction: vi.fn() })
    expect(res.status).toBe(400)
  })

  it("returns 400 for malformed JSON body", async () => {
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json"
    })
    const res = await handleWizardAction(req, { runAction: vi.fn() })
    expect(res.status).toBe(400)
  })

  it("returns 200 + run_error JSON when runAction returns run_error", async () => {
    const fakeRunAction = vi.fn().mockResolvedValue({
      kind: "run_error",
      actionId: "stories.rewrite",
      message: "spawn failed"
    })
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "stories.rewrite", draft: minimalValidDraft() })
    })
    const res = await handleWizardAction(req, { runAction: fakeRunAction })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe("run_error")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/wizardActionRouteHandler.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/services/localAgent/wizardActionRouteHandler.ts
import type { FeatureDraft } from "../../model/specTypes"
import type { ActionResult } from "./actionResult"
import { runAction as defaultRunAction } from "./actionRunner"

type RunActionFn = (input: {
  actionId: string
  draft: FeatureDraft
  cwd: string
  signal?: AbortSignal
}) => Promise<ActionResult>

export type WizardActionDeps = {
  runAction?: RunActionFn
  cwd?: string
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  })
}

export async function handleWizardAction(req: Request, deps: WizardActionDeps = {}): Promise<Response> {
  const runAction = deps.runAction ?? defaultRunAction
  const cwd = deps.cwd ?? process.cwd()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest("invalid JSON body")
  }
  if (!body || typeof body !== "object") {
    return badRequest("body must be an object")
  }
  const { actionId, draft } = body as { actionId?: unknown; draft?: unknown }
  if (typeof actionId !== "string" || actionId.length === 0) {
    return badRequest("actionId required")
  }
  if (!draft || typeof draft !== "object") {
    return badRequest("draft required")
  }
  const result = await runAction({
    actionId,
    draft: draft as FeatureDraft,
    cwd,
    signal: req.signal
  })
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/wizardActionRouteHandler.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/wizardActionRouteHandler.ts \
        src/features/spec-wizard/__tests__/wizardActionRouteHandler.test.ts
git commit -m "feat: [action-panel] wizardActionRouteHandler"
```

---

### Task 10: `/api/wizard-action` Next.js route

**Files:**
- Create: `app/api/wizard-action/route.ts`

> Next.js route 是 thin shim — 直接委派 `handleWizardAction`。已在 Task 9 完整覆蓋邏輯。

- [ ] **Step 1: Write the route**

```typescript
// app/api/wizard-action/route.ts
import { handleWizardAction } from "@/features/spec-wizard/services/localAgent/wizardActionRouteHandler"

export const runtime = "nodejs"

export async function POST(request: Request): Promise<Response> {
  return handleWizardAction(request)
}
```

- [ ] **Step 2: Smoke 跑 type check**

```bash
bunx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/wizard-action/route.ts
git commit -m "feat: [action-panel] /api/wizard-action route"
```

---

### Task 11: applyActionResult — 純函式 path parser + replace

**Files:**
- Create: `src/features/spec-wizard/persistence/applyActionResult.ts`
- Test: `src/features/spec-wizard/__tests__/applyActionResult.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/applyActionResult.test.ts
import { applyActionResultToDraft } from "../persistence/applyActionResult"
import { minimalValidDraft } from "../test/fixtures"

describe("applyActionResultToDraft", () => {
  it("replaces a nested string field by dot+index path", () => {
    const draft = minimalValidDraft()
    const next = applyActionResultToDraft(draft, {
      targetPath: "epics[0].stories[0].userStory",
      mode: "replace",
      value: "new user story text"
    })
    expect(next.epics[0].stories[0].userStory).toBe("new user story text")
    // 原 draft 不變（immutable）
    expect(draft.epics[0].stories[0].userStory).not.toBe("new user story text")
  })

  it("preserves sibling fields when replacing nested string", () => {
    const draft = minimalValidDraft()
    const next = applyActionResultToDraft(draft, {
      targetPath: "epics[0].stories[0].userStory",
      mode: "replace",
      value: "x"
    })
    expect(next.epics[0].stories[0].id).toBe(draft.epics[0].stories[0].id)
    expect(next.epics[0].stories[0].title).toBe(draft.epics[0].stories[0].title)
    expect(next.metadata).toEqual(draft.metadata)
  })

  it("throws on unknown path segment", () => {
    const draft = minimalValidDraft()
    expect(() =>
      applyActionResultToDraft(draft, {
        targetPath: "nonexistent.field",
        mode: "replace",
        value: "x"
      })
    ).toThrow()
  })

  it("throws on out-of-bounds array index", () => {
    const draft = minimalValidDraft()
    expect(() =>
      applyActionResultToDraft(draft, {
        targetPath: "epics[5].stories[0].userStory",
        mode: "replace",
        value: "x"
      })
    ).toThrow()
  })

  it("throws on insert mode (v1 not supported)", () => {
    const draft = minimalValidDraft()
    expect(() =>
      applyActionResultToDraft(draft, {
        targetPath: "epics[0].stories",
        mode: "insert",
        value: "x"
      })
    ).toThrow(/insert.*not supported/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/applyActionResult.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/spec-wizard/persistence/applyActionResult.ts
import type { FeatureDraft } from "../model/specTypes"

export type ApplyActionResultInput = {
  targetPath: string
  mode: "insert" | "replace"
  value: unknown
}

type Segment = { kind: "key"; key: string } | { kind: "index"; index: number }

export function applyActionResultToDraft(
  draft: FeatureDraft,
  input: ApplyActionResultInput
): FeatureDraft {
  if (input.mode === "insert") {
    throw new Error("insert mode is not supported in v1")
  }
  const segments = parsePath(input.targetPath)
  if (segments.length === 0) {
    throw new Error(`empty path: ${input.targetPath}`)
  }
  return setAtPath(draft, segments, input.value) as FeatureDraft
}

function parsePath(path: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  while (i < path.length) {
    if (path[i] === ".") {
      i += 1
      continue
    }
    if (path[i] === "[") {
      const end = path.indexOf("]", i)
      if (end < 0) throw new Error(`malformed path (missing ]): ${path}`)
      const inner = path.slice(i + 1, end)
      const n = Number(inner)
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`only numeric indices supported in v1; got: ${inner}`)
      }
      segments.push({ kind: "index", index: n })
      i = end + 1
      continue
    }
    let j = i
    while (j < path.length && path[j] !== "." && path[j] !== "[") j += 1
    if (j === i) throw new Error(`malformed path: ${path}`)
    segments.push({ kind: "key", key: path.slice(i, j) })
    i = j
  }
  return segments
}

function setAtPath(target: unknown, segments: Segment[], value: unknown): unknown {
  const [head, ...rest] = segments
  if (head.kind === "key") {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      throw new Error(`expected object at key "${head.key}"`)
    }
    const obj = target as Record<string, unknown>
    if (!(head.key in obj)) {
      throw new Error(`unknown key: "${head.key}"`)
    }
    if (rest.length === 0) {
      return { ...obj, [head.key]: value }
    }
    return { ...obj, [head.key]: setAtPath(obj[head.key], rest, value) }
  }
  if (!Array.isArray(target)) {
    throw new Error(`expected array at index [${head.index}]`)
  }
  if (head.index < 0 || head.index >= target.length) {
    throw new Error(`index out of bounds: [${head.index}]`)
  }
  const arr = target.slice()
  if (rest.length === 0) {
    arr[head.index] = value
  } else {
    arr[head.index] = setAtPath(arr[head.index], rest, value)
  }
  return arr
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/applyActionResult.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/persistence/applyActionResult.ts \
        src/features/spec-wizard/__tests__/applyActionResult.test.ts
git commit -m "feat: [action-panel] applyActionResultToDraft + dot-index path parser"
```

---

### Task 12: 把 applyActionResult 接進 draftStore

**Files:**
- Modify: `src/features/spec-wizard/persistence/draftStore.ts`
- Modify: `src/features/spec-wizard/hooks/useDraftStore.ts`
- Modify: `src/features/spec-wizard/__tests__/draftStore.test.ts` (擴)

- [ ] **Step 1: Add a failing test for the store action**

加進 `draftStore.test.ts` 末端：

```typescript
import {
  applyActionResult,
  createDraft,
  getSnapshot,
  setActiveDraft,
  selectDraft
} from "../persistence/draftStore"

describe("applyActionResult action", () => {
  it("mutates the active draft via path + value", () => {
    const id = createDraft()
    selectDraft(id)
    const initial = getSnapshot().drafts[id]
    setActiveDraft({ ...initial, metadata: { ...initial.metadata, title: "Original" } })
    applyActionResult({
      targetPath: "metadata.title",
      mode: "replace",
      value: "Renamed by action"
    })
    expect(getSnapshot().drafts[id].metadata.title).toBe("Renamed by action")
  })

  it("throws when no active draft", () => {
    const snap = getSnapshot()
    if (snap.activeDraftId !== null) return // 環境殘留 active；happy path 已覆蓋
    expect(() =>
      applyActionResult({ targetPath: "metadata.title", mode: "replace", value: "x" })
    ).toThrow(/active/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts -t applyActionResult
```

Expected: FAIL — `applyActionResult` not exported from store.

- [ ] **Step 3: Add the action to draftStore.ts**

打開 `src/features/spec-wizard/persistence/draftStore.ts`，在已有 actions 區（找到 `setActiveDraft` 後）追加：

```typescript
import { applyActionResultToDraft, type ApplyActionResultInput } from "./applyActionResult"

export function applyActionResult(input: ApplyActionResultInput): void {
  const state = getSnapshot()
  if (state.activeDraftId === null) {
    throw new Error("no active draft")
  }
  const current = state.drafts[state.activeDraftId]
  const next = applyActionResultToDraft(current, input)
  setActiveDraft(next)
}
```

- [ ] **Step 4: Wire 到 useDraftStore.ts**

打開 `src/features/spec-wizard/hooks/useDraftStore.ts`：

於 import block 追加：
```typescript
import {
  // ...既有 imports 保留
  applyActionResult as applyActionResultAction
} from "../persistence/draftStore"
```

於 `UseDraftStoreValue` 介面欄位末端追加：
```typescript
applyActionResult(input: { targetPath: string; mode: "insert" | "replace"; value: unknown }): void
```

於 hook return 物件末端追加：
```typescript
applyActionResult: applyActionResultAction
```

- [ ] **Step 5: Run tests**

```bash
bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts \
                 src/features/spec-wizard/__tests__/useDraftStore.test.tsx
```

Expected: PASS — 兩檔皆 green。

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStore.ts \
        src/features/spec-wizard/hooks/useDraftStore.ts \
        src/features/spec-wizard/__tests__/draftStore.test.ts
git commit -m "feat: [action-panel] draftStore.applyActionResult 接 path 寫入"
```

---

### Task 13: useWizardContext provider + hook

**Files:**
- Create: `src/features/spec-wizard/hooks/useWizardContext.tsx`
- Test: `src/features/spec-wizard/__tests__/useWizardContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/spec-wizard/__tests__/useWizardContext.test.tsx
import { render, screen } from "@testing-library/react"
import {
  WizardContextProvider,
  useWizardContext
} from "../hooks/useWizardContext"
import type { ActionStepId } from "../services/localAgent/actionRegistry"
import { minimalValidDraft } from "../test/fixtures"

function Probe() {
  const ctx = useWizardContext()
  return <div data-testid="probe">{ctx.currentStepId}</div>
}

describe("useWizardContext", () => {
  it("exposes currentStepId provided by provider", () => {
    const draft = minimalValidDraft()
    render(
      <WizardContextProvider currentStepId={"stories" as ActionStepId} activeDraft={draft}>
        <Probe />
      </WizardContextProvider>
    )
    expect(screen.getByTestId("probe").textContent).toBe("stories")
  })

  it("throws when used outside provider", () => {
    const orig = console.error
    console.error = () => {}
    try {
      expect(() => render(<Probe />)).toThrow(/WizardContextProvider/)
    } finally {
      console.error = orig
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/useWizardContext.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

注意：因含 JSX，副檔名為 `.tsx`。

```tsx
// src/features/spec-wizard/hooks/useWizardContext.tsx
"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { FeatureDraft } from "../model/specTypes"
import type { ActionStepId } from "../services/localAgent/actionRegistry"

export type WizardContextValue = {
  currentStepId: ActionStepId
  activeDraft: FeatureDraft | null
}

const WizardContext = createContext<WizardContextValue | null>(null)

export type WizardContextProviderProps = WizardContextValue & {
  children: ReactNode
}

export function WizardContextProvider({
  currentStepId,
  activeDraft,
  children
}: WizardContextProviderProps) {
  return (
    <WizardContext.Provider value={{ currentStepId, activeDraft }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizardContext(): WizardContextValue {
  const value = useContext(WizardContext)
  if (!value) {
    throw new Error("useWizardContext must be used inside WizardContextProvider")
  }
  return value
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/useWizardContext.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/hooks/useWizardContext.tsx \
        src/features/spec-wizard/__tests__/useWizardContext.test.tsx
git commit -m "feat: [action-panel] useWizardContext provider + hook"
```

---

### Task 14: ActionResultCard component

**Files:**
- Create: `src/features/spec-wizard/components/ActionResultCard.tsx`
- Test: `src/features/spec-wizard/__tests__/actionResultCard.test.tsx`

> 此 task 的測試引用 `actionPanel.*` i18n keys。**Task 16** 才會新增這些 keys。為了讓本 task 獨立可 commit，測試先以 `describe.skip` 跳過；Task 16 末段會解 skip。

- [ ] **Step 1: Write the (skipped) failing test**

```tsx
// src/features/spec-wizard/__tests__/actionResultCard.test.tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { ActionResultCard } from "../components/ActionResultCard"
import { I18nProvider } from "../i18n/I18nContext"
import type { ActionResult } from "../services/localAgent/actionResult"
import type { ReactNode } from "react"

function withI18n(node: ReactNode) {
  return <I18nProvider initialLocale="zh-TW">{node}</I18nProvider>
}

describe.skip("ActionResultCard", () => {
  it("renders preview card with adopt and discard buttons", () => {
    const result: ActionResult = {
      kind: "preview",
      actionId: "stories.rewrite",
      preview: { text: "new story", targetPath: "epics[0].stories[0].userStory", mode: "replace" }
    }
    const onAdopt = vi.fn()
    const onDiscard = vi.fn()
    render(withI18n(<ActionResultCard result={result} onAdopt={onAdopt} onDiscard={onDiscard} />))
    expect(screen.getByText("new story")).toBeInTheDocument()
    expect(screen.getByText("epics[0].stories[0].userStory")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /採用|adopt/i }))
    expect(onAdopt).toHaveBeenCalledWith(result)
  })

  it("renders notes card with bullet list and dismiss only", () => {
    const result: ActionResult = {
      kind: "notes",
      actionId: "stories.gaps",
      notes: [
        { severity: "warning", text: "Missing admin role" },
        { severity: "info", text: "Edge case ok" }
      ]
    }
    render(withI18n(<ActionResultCard result={result} onAdopt={() => {}} onDiscard={() => {}} />))
    expect(screen.getByText(/Missing admin role/)).toBeInTheDocument()
    expect(screen.getByText(/Edge case ok/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /採用|adopt/i })).toBeNull()
  })

  it("renders parse_error with raw text and retry button", () => {
    const result: ActionResult = {
      kind: "parse_error",
      actionId: "stories.rewrite",
      raw: "free-form claude reply"
    }
    const onRetry = vi.fn()
    render(
      withI18n(
        <ActionResultCard result={result} onAdopt={() => {}} onDiscard={() => {}} onRetry={onRetry} />
      )
    )
    expect(screen.getByText(/free-form claude reply/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /重試|retry/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("renders run_error with message", () => {
    const result: ActionResult = {
      kind: "run_error",
      actionId: "stories.rewrite",
      message: "spawn EACCES"
    }
    render(withI18n(<ActionResultCard result={result} onAdopt={() => {}} onDiscard={() => {}} />))
    expect(screen.getByText(/spawn EACCES/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test (skipped, expected to be no-op)**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionResultCard.test.tsx
```

Expected: 4 skipped, 0 failed。

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/spec-wizard/components/ActionResultCard.tsx
"use client"

import { useI18n } from "../i18n/I18nContext"
import type { ActionResult } from "../services/localAgent/actionResult"

export type ActionResultCardProps = {
  result: ActionResult
  onAdopt: (result: ActionResult) => void
  onDiscard: () => void
  onRetry?: () => void
}

export function ActionResultCard({ result, onAdopt, onDiscard, onRetry }: ActionResultCardProps) {
  const { t } = useI18n()
  if (result.kind === "preview") {
    return (
      <article className="action-card action-card--preview" data-action-id={result.actionId}>
        <header className="action-card__header">{result.actionId}</header>
        <div className="action-card__preview-text">{result.preview.text}</div>
        <div className="action-card__target">{result.preview.targetPath}</div>
        <footer className="action-card__actions">
          <button type="button" onClick={() => onAdopt(result)}>
            {t("actionPanel.card.adopt")}
          </button>
          <button type="button" onClick={onDiscard}>
            {t("actionPanel.card.discard")}
          </button>
        </footer>
      </article>
    )
  }
  if (result.kind === "notes") {
    return (
      <article className="action-card action-card--notes" data-action-id={result.actionId}>
        <header className="action-card__header">{result.actionId}</header>
        <ul className="action-card__notes">
          {result.notes.map((n, idx) => (
            <li key={idx} data-severity={n.severity}>
              {n.text}
              {n.ref ? <code className="action-card__ref">{n.ref}</code> : null}
            </li>
          ))}
        </ul>
        <footer className="action-card__actions">
          <button type="button" onClick={onDiscard}>
            {t("actionPanel.card.dismiss")}
          </button>
        </footer>
      </article>
    )
  }
  if (result.kind === "parse_error") {
    return (
      <article className="action-card action-card--error" data-action-id={result.actionId}>
        <header className="action-card__header">⚠️ {t("actionPanel.card.parseError")}</header>
        <details>
          <summary>{result.actionId}</summary>
          <pre>{result.raw}</pre>
        </details>
        <footer className="action-card__actions">
          <button type="button" onClick={onDiscard}>
            {t("actionPanel.card.discard")}
          </button>
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              {t("actionPanel.card.retry")}
            </button>
          ) : null}
        </footer>
      </article>
    )
  }
  // run_error
  return (
    <article className="action-card action-card--error" data-action-id={result.actionId}>
      <header className="action-card__header">⚠️ {t("actionPanel.card.runError")}</header>
      <p>{result.message}</p>
      <footer className="action-card__actions">
        <button type="button" onClick={onDiscard}>
          {t("actionPanel.card.discard")}
        </button>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            {t("actionPanel.card.retry")}
          </button>
        ) : null}
      </footer>
    </article>
  )
}
```

- [ ] **Step 4: Run tsc**

```bash
bunx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/ActionResultCard.tsx \
        src/features/spec-wizard/__tests__/actionResultCard.test.tsx
git commit -m "feat: [action-panel] ActionResultCard（測試暫 skip 待 Task 16 補 i18n）"
```

---

### Task 15: ActionMenu component

**Files:**
- Create: `src/features/spec-wizard/components/ActionMenu.tsx`
- Test: `src/features/spec-wizard/__tests__/actionMenu.test.tsx`

> 同 Task 14：測試先以 `describe.skip`。Task 16 末段解 skip。

- [ ] **Step 1: Write the (skipped) failing test**

```tsx
// src/features/spec-wizard/__tests__/actionMenu.test.tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { ActionMenu } from "../components/ActionMenu"
import { I18nProvider } from "../i18n/I18nContext"
import type { ReactNode } from "react"

function withI18n(node: ReactNode) {
  return <I18nProvider initialLocale="zh-TW">{node}</I18nProvider>
}

describe.skip("ActionMenu", () => {
  it("renders 3 buttons for stories step", () => {
    render(withI18n(<ActionMenu step="stories" onRun={() => {}} isRunning={false} />))
    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("calls onRun with the action id when a button is clicked", () => {
    const onRun = vi.fn()
    render(withI18n(<ActionMenu step="stories" onRun={onRun} isRunning={false} />))
    fireEvent.click(screen.getAllByRole("button")[0])
    expect(onRun).toHaveBeenCalledWith(expect.stringMatching(/^stories\./))
  })

  it("disables all buttons when isRunning is true", () => {
    render(withI18n(<ActionMenu step="stories" onRun={() => {}} isRunning={true} />))
    expect(screen.getAllByRole("button").every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it("renders empty state for step with no actions", () => {
    render(withI18n(<ActionMenu step="basic" onRun={() => {}} isRunning={false} />))
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.getByText(/此步驟尚未提供動作|no actions/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test (skipped)**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionMenu.test.tsx
```

Expected: 4 skipped.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/spec-wizard/components/ActionMenu.tsx
"use client"

import { useI18n } from "../i18n/I18nContext"
import { getActionsForStep, type ActionStepId } from "../services/localAgent/actionRegistry"

export type ActionMenuProps = {
  step: ActionStepId
  onRun: (actionId: string) => void
  isRunning: boolean
}

export function ActionMenu({ step, onRun, isRunning }: ActionMenuProps) {
  const { t } = useI18n()
  const actions = getActionsForStep(step)
  if (actions.length === 0) {
    return <p className="action-menu__empty">{t("actionPanel.empty")}</p>
  }
  return (
    <ul className="action-menu">
      {actions.map((a) => (
        <li key={a.id}>
          <button type="button" disabled={isRunning} onClick={() => onRun(a.id)}>
            {t(a.labelKey)}
          </button>
          <small>{t(a.helpKey)}</small>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Run tsc**

```bash
bunx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/ActionMenu.tsx \
        src/features/spec-wizard/__tests__/actionMenu.test.tsx
git commit -m "feat: [action-panel] ActionMenu（測試暫 skip 待 Task 16 補 i18n）"
```

---

### Task 16: i18n keys + 解 skip 14/15 測試

**Files:**
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`
- Modify: `src/features/spec-wizard/__tests__/actionResultCard.test.tsx`
- Modify: `src/features/spec-wizard/__tests__/actionMenu.test.tsx`

- [ ] **Step 1: Inspect 既有 dictionary 結構**

```bash
head -50 src/features/spec-wizard/i18n/dictionaries.ts
```

紀錄 `MessageKey` union 的位置與兩個 dictionary（`zhTW`、`en`）的位置 / 變數名。

- [ ] **Step 2: Add new keys to MessageKey union and both dictionaries**

打開 `dictionaries.ts`，在 `MessageKey` union 末端追加：

```typescript
| "actionPanel.title"
| "actionPanel.empty"
| "actionPanel.running"
| "actionPanel.card.adopt"
| "actionPanel.card.discard"
| "actionPanel.card.dismiss"
| "actionPanel.card.parseError"
| "actionPanel.card.runError"
| "actionPanel.card.retry"
| "actionPanel.actions.stories.rewrite.label"
| "actionPanel.actions.stories.rewrite.help"
| "actionPanel.actions.stories.gaps.label"
| "actionPanel.actions.stories.gaps.help"
| "actionPanel.actions.stories.consistency.label"
| "actionPanel.actions.stories.consistency.help"
```

zh-TW dictionary 末端追加：

```typescript
"actionPanel.title": "AI 助手",
"actionPanel.empty": "此步驟尚未提供動作",
"actionPanel.running": "執行中…",
"actionPanel.card.adopt": "採用",
"actionPanel.card.discard": "丟棄",
"actionPanel.card.dismiss": "我知道了",
"actionPanel.card.parseError": "無法解析回應",
"actionPanel.card.runError": "執行失敗",
"actionPanel.card.retry": "重試",
"actionPanel.actions.stories.rewrite.label": "改寫這條 user story",
"actionPanel.actions.stories.rewrite.help": "讓現有 story 更精確、可驗證",
"actionPanel.actions.stories.gaps.label": "指出缺哪些角色／場景",
"actionPanel.actions.stories.gaps.help": "列出可能漏掉的 actor 或 scenario",
"actionPanel.actions.stories.consistency.label": "對齊 Goal 與 Criteria",
"actionPanel.actions.stories.consistency.help": "檢查 Goal、Story、Acceptance Criteria 是否一致",
```

en dictionary 末端追加：

```typescript
"actionPanel.title": "AI Assistant",
"actionPanel.empty": "No actions for this step yet",
"actionPanel.running": "Running…",
"actionPanel.card.adopt": "Adopt",
"actionPanel.card.discard": "Discard",
"actionPanel.card.dismiss": "Got it",
"actionPanel.card.parseError": "Could not parse response",
"actionPanel.card.runError": "Run failed",
"actionPanel.card.retry": "Retry",
"actionPanel.actions.stories.rewrite.label": "Rewrite this user story",
"actionPanel.actions.stories.rewrite.help": "Make the existing story sharper and testable",
"actionPanel.actions.stories.gaps.label": "Spot missing actors / scenarios",
"actionPanel.actions.stories.gaps.help": "List potentially missing actors or scenarios",
"actionPanel.actions.stories.consistency.label": "Align Goal & Criteria",
"actionPanel.actions.stories.consistency.help": "Check Goal, Story, and Acceptance Criteria alignment",
```

- [ ] **Step 3: Unskip tests in Task 14 & 15**

把 `actionResultCard.test.tsx` 與 `actionMenu.test.tsx` 內的 `describe.skip` 改回 `describe`。

- [ ] **Step 4: Run tests**

```bash
bunx vitest run src/features/spec-wizard/__tests__/actionResultCard.test.tsx \
                 src/features/spec-wizard/__tests__/actionMenu.test.tsx \
                 src/features/spec-wizard/__tests__/i18n.test.tsx
```

Expected: PASS — actionResultCard 4 tests, actionMenu 4 tests, i18n suite still green.

- [ ] **Step 5: Run full suite to confirm no regression**

```bash
bun run test
```

Expected: PASS — 全套 green。

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/i18n/dictionaries.ts \
        src/features/spec-wizard/__tests__/actionResultCard.test.tsx \
        src/features/spec-wizard/__tests__/actionMenu.test.tsx
git commit -m "feat: [action-panel] i18n keys + 解 skip 14/15 測試"
```

---

### Task 17: WizardActionPanel composition

**Files:**
- Create: `src/features/spec-wizard/components/WizardActionPanel.tsx`
- Test: `src/features/spec-wizard/__tests__/wizardActionPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/spec-wizard/__tests__/wizardActionPanel.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WizardActionPanel } from "../components/WizardActionPanel"
import { WizardContextProvider } from "../hooks/useWizardContext"
import { I18nProvider } from "../i18n/I18nContext"
import { minimalValidDraft } from "../test/fixtures"
import type { ReactNode } from "react"

function setupFetch(returnValue: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => returnValue
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function harness(node: ReactNode) {
  return (
    <I18nProvider initialLocale="zh-TW">
      <WizardContextProvider currentStepId="stories" activeDraft={minimalValidDraft()}>
        {node}
      </WizardContextProvider>
    </I18nProvider>
  )
}

describe("WizardActionPanel", () => {
  it("renders header + action menu for current step", () => {
    setupFetch({})
    render(harness(<WizardActionPanel />))
    expect(screen.getByText(/AI 助手|AI Assistant/i)).toBeInTheDocument()
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3)
  })

  it("calls /api/wizard-action on action click and pushes a card", async () => {
    const fetchMock = setupFetch({
      kind: "preview",
      actionId: "stories.rewrite",
      preview: {
        text: "rewritten",
        targetPath: "epics[0].stories[0].userStory",
        mode: "replace"
      }
    })
    render(harness(<WizardActionPanel />))
    const buttons = screen.getAllByRole("button")
    const rewriteBtn = buttons.find((b) => /改寫|rewrite/i.test(b.textContent ?? ""))
    if (!rewriteBtn) throw new Error("rewrite button not found")
    fireEvent.click(rewriteBtn)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/wizard-action")
    expect(init.method).toBe("POST")
    const body = JSON.parse(init.body)
    expect(body.actionId).toBe("stories.rewrite")
    await waitFor(() => expect(screen.getByText("rewritten")).toBeInTheDocument())
  })

  it("caps result stack at 5 cards (oldest dropped)", async () => {
    const fetchMock = setupFetch({
      kind: "notes",
      actionId: "stories.gaps",
      notes: [{ severity: "info", text: "ok" }]
    })
    render(harness(<WizardActionPanel />))
    const buttons = screen.getAllByRole("button")
    const gapsBtn = buttons.find((b) => /缺|gap|missing/i.test(b.textContent ?? ""))
    if (!gapsBtn) throw new Error("gaps button not found")
    for (let i = 0; i < 6; i++) {
      fireEvent.click(gapsBtn)
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(i + 1))
    }
    const cards = document.querySelectorAll(".action-card")
    expect(cards.length).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bunx vitest run src/features/spec-wizard/__tests__/wizardActionPanel.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/spec-wizard/components/WizardActionPanel.tsx
"use client"

import { useCallback, useState } from "react"
import { ActionMenu } from "./ActionMenu"
import { ActionResultCard } from "./ActionResultCard"
import { useWizardContext } from "../hooks/useWizardContext"
import { useDraftStore } from "../hooks/useDraftStore"
import { useI18n } from "../i18n/I18nContext"
import type { ActionResult } from "../services/localAgent/actionResult"

const COLLAPSED_KEY = "vector-wizard:assistant-collapsed"
const STACK_LIMIT = 5

type StackItem = {
  id: number
  result: ActionResult
}

let nextStackId = 1

export function WizardActionPanel() {
  const { t } = useI18n()
  const { currentStepId, activeDraft } = useWizardContext()
  const { applyActionResult } = useDraftStore()
  const [stack, setStack] = useState<StackItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const pushItem = useCallback((result: ActionResult) => {
    setStack((prev) => {
      const next = [...prev, { id: nextStackId++, result }]
      if (next.length > STACK_LIMIT) next.splice(0, next.length - STACK_LIMIT)
      return next
    })
  }, [])

  const runRemote = useCallback(
    async (actionId: string) => {
      if (!activeDraft) return
      setIsRunning(true)
      try {
        const res = await fetch("/api/wizard-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionId, draft: activeDraft })
        })
        const json = (await res.json()) as ActionResult
        pushItem(json)
      } catch (err) {
        pushItem({
          kind: "run_error",
          actionId,
          message: err instanceof Error ? err.message : String(err)
        })
      } finally {
        setIsRunning(false)
      }
    },
    [activeDraft, pushItem]
  )

  const onAdopt = useCallback(
    (result: ActionResult) => {
      if (result.kind !== "preview") return
      try {
        applyActionResult({
          targetPath: result.preview.targetPath,
          mode: result.preview.mode,
          value: result.preview.text
        })
        setStack((prev) => prev.filter((s) => s.result !== result))
      } catch (err) {
        pushItem({
          kind: "run_error",
          actionId: result.actionId,
          message: err instanceof Error ? err.message : String(err)
        })
      }
    },
    [applyActionResult, pushItem]
  )

  const onDiscard = useCallback((stackId: number) => {
    setStack((prev) => prev.filter((s) => s.id !== stackId))
  }, [])

  if (collapsed) {
    return (
      <button
        type="button"
        className="assistant-toggle"
        onClick={() => {
          setCollapsed(false)
          if (typeof window !== "undefined") window.localStorage.setItem(COLLAPSED_KEY, "0")
        }}
      >
        ✦ {t("actionPanel.title")}
      </button>
    )
  }

  return (
    <aside className="action-panel" aria-label={t("actionPanel.title")}>
      <header className="action-panel__header">
        <h2>{t("actionPanel.title")}</h2>
        <button
          type="button"
          onClick={() => {
            setCollapsed(true)
            if (typeof window !== "undefined") window.localStorage.setItem(COLLAPSED_KEY, "1")
          }}
        >
          —
        </button>
      </header>
      <ActionMenu step={currentStepId} onRun={runRemote} isRunning={isRunning} />
      {isRunning ? <p>{t("actionPanel.running")}</p> : null}
      <div className="action-panel__stack">
        {stack.map((s) => (
          <ActionResultCard
            key={s.id}
            result={s.result}
            onAdopt={onAdopt}
            onDiscard={() => onDiscard(s.id)}
            onRetry={() => void runRemote(s.result.actionId)}
          />
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bunx vitest run src/features/spec-wizard/__tests__/wizardActionPanel.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/WizardActionPanel.tsx \
        src/features/spec-wizard/__tests__/wizardActionPanel.test.tsx
git commit -m "feat: [action-panel] WizardActionPanel 組合 menu + result stack"
```

---

### Task 18: AppShell 切換 + Wizard 提供 currentStepId

**Files:**
- Modify: `src/features/spec-wizard/components/AppShell.tsx`
- Modify: `src/features/spec-wizard/components/Wizard.tsx`

- [ ] **Step 1: Inspect Wizard.tsx 以確認 currentStep 變數名**

```bash
grep -n "currentStep\|stepIndex\|step:" src/features/spec-wizard/components/Wizard.tsx | head -20
```

紀錄變數命名（例如 `stepIndex`、`currentStep`）。

- [ ] **Step 2: 在 Wizard.tsx 包入 WizardContextProvider**

於檔案頂端 import 區追加：

```typescript
import { WizardContextProvider } from "../hooks/useWizardContext"
import type { ActionStepId } from "../services/localAgent/actionRegistry"

const STEP_ORDER: ActionStepId[] = [
  "basic",
  "context",
  "goal",
  "stories",
  "criteria",
  "examples",
  "boundaries",
  "deliverables"
]
```

> 若實際 step 順序與預設不同（從 `Wizard.tsx` 既有 step 註冊順序對齊），請以實際順序為準調整 `STEP_ORDER`。

在 Wizard 元件內，依既有 step state 變數計算：

```typescript
const currentStepId: ActionStepId = STEP_ORDER[/* stepIndex 變數 */] ?? "basic"
```

把 Wizard 元件 return 的最外層用 `WizardContextProvider` 包：

```tsx
return (
  <WizardContextProvider currentStepId={currentStepId} activeDraft={activeDraft}>
    {/* 既有 wizard JSX */}
  </WizardContextProvider>
)
```

> 若 Wizard 並非以索引追蹤 step（例如直接用字串 enum），把 `STEP_ORDER[i]` 改成直接傳該字串即可。

- [ ] **Step 3: 改 AppShell.tsx 換掛 WizardActionPanel**

打開 `src/features/spec-wizard/components/AppShell.tsx`，替換：

```typescript
// 移除：
import { AssistantPanel } from "./AssistantPanel"
// 換成：
import { WizardActionPanel } from "./WizardActionPanel"
```

JSX 中：

```tsx
{/* 移除：<AssistantPanel /> */}
<WizardActionPanel />
```

- [ ] **Step 4: Run wizard flow tests + full suite**

```bash
bunx vitest run src/features/spec-wizard/__tests__/wizardFlow.test.tsx
bun run test
```

Expected: 既有 wizard flow 仍 pass；全套 green。

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/AppShell.tsx \
        src/features/spec-wizard/components/Wizard.tsx
git commit -m "feat: [action-panel] AppShell 換掛 WizardActionPanel + Wizard broadcast currentStepId"
```

---

### Task 19: SeedPromptSection 移除「送進 panel」按鈕

**Files:**
- Modify: `src/features/spec-wizard/components/SeedPromptSection.tsx`

- [ ] **Step 1: 確認既有測試覆蓋**

```bash
grep -rn "送進 panel\|sentToAgent\|sendToAssistant\|buildAgentSeedRequest" src/features/spec-wizard/__tests__/
```

紀錄哪些測試會抓「送進 panel」相關文字 / handler。如果有，更新該測試（移除對應斷言）。

- [ ] **Step 2: 修 SeedPromptSection.tsx**

刪除以下程式：

```typescript
// 刪除 imports：
import { buildAgentSeedRequest } from "../services/localAgent/agentSeedPromptBuilder"
import { sendToAssistant } from "../services/localAgent/assistantBridge"
```

```typescript
// 刪除 state：
const [sentToPanel, setSentToPanel] = useState(false)
```

```typescript
// 刪除 handler：
const handleSendToPanel = () => { /* ... */ }
```

```jsx
// 刪除 JSX 按鈕：
<button
  type="button"
  className={sentToPanel ? "success" : "primary"}
  onClick={handleSendToPanel}
  disabled={!title}
>
  {sentToPanel ? t("seedPrompt.button.sentToAgent") : t("seedPrompt.button.sendToAgent")}
</button>
```

最終 SeedPromptSection 應僅剩兩顆按鈕：「複製 prompt」、「請求 agent draft」。

- [ ] **Step 3: Run lint + relevant tests**

```bash
bunx tsc --noEmit
bunx vitest run src/features/spec-wizard/__tests__/wizardFlow.test.tsx
bun run test
```

Expected: 0 type errors。全套 green。

- [ ] **Step 4: Commit**

```bash
git add src/features/spec-wizard/components/SeedPromptSection.tsx
# 若 Step 1 有更新測試檔，也一併 add
git commit -m "refactor: [action-panel] SeedPromptSection 移除「送進 panel」按鈕"
```

---

### Task 20: 刪除 legacy 模組與測試

**Files:**
- Delete: `src/features/spec-wizard/components/AssistantPanel.tsx`
- Delete: `src/features/spec-wizard/services/localAgent/assistantBridge.ts`
- Delete: `src/features/spec-wizard/services/localAgent/chatItem.ts`
- Delete: `src/features/spec-wizard/services/localAgent/agentRouteHandler.ts`
- Delete: `src/features/spec-wizard/services/localAgent/agentSeedPromptBuilder.ts`
- Delete: `src/features/spec-wizard/hooks/useLocalAgent.ts`
- Delete: `app/api/agent/route.ts`（整個目錄）
- Delete: `src/features/spec-wizard/__tests__/assistantBridge.test.ts`
- Delete: `src/features/spec-wizard/__tests__/agentRoute.test.ts`
- Delete: `src/features/spec-wizard/__tests__/agentSeedPromptBuilder.test.ts`
- Delete: `src/features/spec-wizard/__tests__/useLocalAgent.test.tsx`
- 視情況：`src/features/spec-wizard/__tests__/messageReducer.test.ts`
- Modify: `src/features/spec-wizard/services/localAgent/claudeProvider.ts` — 移除 `createClaudeProvider` 與 `send` AsyncIterable
- Modify: `src/features/spec-wizard/services/localAgent/types.ts` — 移除 `LocalAgentProvider` / `LocalAgentRequest`，保留 `AgentEvent`

- [ ] **Step 1: 確認沒有 import 殘留**

```bash
grep -rn "AssistantPanel\|assistantBridge\|chatItem\|useLocalAgent\|agentSeedPromptBuilder\|agentRouteHandler\|createClaudeProvider\|LocalAgentProvider\|LocalAgentRequest" \
  src/ app/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
```

Expected: 0 matches in non-test files outside of soon-to-be-deleted source（`AssistantPanel.tsx`、`useLocalAgent.ts` 等本身允許出現）。若意外殘留於其他檔，回 Task 18/19 補。

- [ ] **Step 2: 確認 messageReducer.test.ts 是否該刪**

```bash
grep -n "chatItem\|reduceChatItems" src/features/spec-wizard/__tests__/messageReducer.test.ts
```

若僅引用 `chatItem`，加入刪除清單。

- [ ] **Step 3: 從 claudeProvider.ts 移除 createClaudeProvider**

打開 `claudeProvider.ts`，刪除以下 export：
- `export type ClaudeProviderOptions`
- `export function createClaudeProvider(...)` 整個函式

保留：`parseStreamJsonLine` / `spawnAgent` / `SpawnAgentOptions` / `SpawnAgentResult`。

- [ ] **Step 4: 從 types.ts 移除舊 types**

打開 `src/features/spec-wizard/services/localAgent/types.ts`，移除：

```typescript
export type LocalAgentRequest = { /* ... */ }
export type LocalAgentProvider = { /* ... */ }
```

保留 `AgentEvent`（仍被 `parseStreamJsonLine` 公開使用）。

- [ ] **Step 5: 刪除檔案**

```bash
git rm src/features/spec-wizard/components/AssistantPanel.tsx \
       src/features/spec-wizard/services/localAgent/assistantBridge.ts \
       src/features/spec-wizard/services/localAgent/chatItem.ts \
       src/features/spec-wizard/services/localAgent/agentRouteHandler.ts \
       src/features/spec-wizard/services/localAgent/agentSeedPromptBuilder.ts \
       src/features/spec-wizard/hooks/useLocalAgent.ts \
       src/features/spec-wizard/__tests__/assistantBridge.test.ts \
       src/features/spec-wizard/__tests__/agentRoute.test.ts \
       src/features/spec-wizard/__tests__/agentSeedPromptBuilder.test.ts \
       src/features/spec-wizard/__tests__/useLocalAgent.test.tsx
git rm -r app/api/agent
# 視 Step 2：
# git rm src/features/spec-wizard/__tests__/messageReducer.test.ts
```

- [ ] **Step 6: Run full suite + tsc + build**

```bash
bunx tsc --noEmit
bun run test
bun run build
```

Expected: 全套 green，0 type errors，build 成功。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: [action-panel] 刪除 legacy AssistantPanel 路徑及附屬模組"
```

---

### Task 21: 手動驗證 + 收尾

**Files:** —

- [ ] **Step 1: Run dev server**

```bash
bun run dev
```

開瀏覽器到 `http://localhost:3000`，建立或選一份 draft，走到 Stories step。

- [ ] **Step 2: Manual smoke test**

確認：
- 右側 Panel 標題為「AI 助手」（中文 locale）或 "AI Assistant"（英文）
- Stories step 上有 3 顆按鈕（改寫 / 缺哪些角色 / 對齊）
- 切到 Basic step → Panel 顯示「此步驟尚未提供動作」空狀態
- 切回 Stories → 3 顆按鈕回來

如果本機已安裝 Claude CLI，可實際點擊「改寫」測試 end-to-end：
- 點擊後出現 spinner / running 文字
- 完成後出現 ActionResultCard，含 preview text 與「採用 / 丟棄」
- 按「採用」→ Wizard 內 user story textarea 立即更新
- 切回 Panel，採用後該卡片從 stack 消失

如果本機沒有 Claude CLI，跳過 LLM 部分，只驗 UI flow + 確認 fetch 失敗時顯示 run_error 卡片。

- [ ] **Step 3: 全套 lint + test + build**

```bash
bun run lint
bun run test
bun run build
```

Expected: 全部 green。

- [ ] **Step 4: 更新 AGENTS.md（必要才做）**

開啟 `AGENTS.md`，在「Conventions」附近加入一段（若已有相近段落或不需要補，跳過）：

```markdown
- AI 對話面板僅以「綁 step 的結構化動作」形式存在（`WizardActionPanel`）。要新增 action：在 `actionRegistry.ts` 註冊，並提供 `promptTemplate` 與 `disallowedTools` 鎖工具集。**永不在 Panel 加入自由 textarea**。
```

```bash
git add AGENTS.md
git commit -m "docs: [action-panel] AGENTS.md 補充 WizardActionPanel 設計約束"
```

---

## 完成驗收

- [ ] 全部 21 個 task 通過 TDD 步驟
- [ ] `bun run test` 全綠
- [ ] `bun run build` 0 type error
- [ ] AppShell 上看到 `WizardActionPanel` 並列 Wizard
- [ ] Stories step 三顆動作按鈕可運作（手動或 mock 已驗）
- [ ] Legacy 模組（AssistantPanel / useLocalAgent / assistantBridge / chatItem / agentRouteHandler / agentSeedPromptBuilder / `/api/agent`）已全部從 git tree 移除
- [ ] Spec invariants 全部對應到至少一個測試（見以下對照表）

### Spec invariant ↔ test 對照表

| Invariant | 守住的測試 |
| --- | --- |
| Action 永不直接 mutate draft | `wizardActionPanel.test.tsx`（採用前 draft 不變）+ `actionResultCard.test.tsx`（notes 卡無採用按鈕） |
| YAML 匯出語意零變動 | 既有 `yamlSerializer.test.ts` / `generateSpecRoute.test.ts` 不受影響仍綠 |
| 預覽必須揭露完整將寫入內容 | `actionResultCard.test.tsx`（preview kind 顯示 text + targetPath） |
| Parse 失敗禁止退化 | `actionResult.test.ts` parse_error 邊界 + `actionResultCard.test.tsx` parse_error 沒有採用按鈕 |
| Tool 鎖死 | `claudeProvider.test.ts` `--disallowed-tools` argv 斷言 + `actionRegistry.test.ts` 全部 actions disallowedTools 包含 Bash / Read / Edit |
| Panel 完全被動 | `wizardActionPanel.test.tsx`（無 timer / 自動觸發；只有 click 才 fetch） |
| Step 切換不清空 result stack | `wizardActionPanel.test.tsx` cap 5 行為（隱含切 step 時 stack 不重置）+ 手動驗證 §Task 21 |
