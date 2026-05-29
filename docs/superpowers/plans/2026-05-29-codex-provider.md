# Codex Provider 支援（Path B 雙 agent 擴充）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 in-app local agent（草稿生成與 WizardActionPanel actions）可透過 `VECTOR_AGENT` 環境變數在 `claude` / `codex` CLI 間切換，並讓 Codex CLI 也能找到 Path B 方法論 skill 入口，全程不改動既有 import 路徑與對外函式簽名。

**Architecture:** 抽出 `providers/` 子目錄，定義 `AgentProvider` interface（`spawn(opts) → { text, exitCode }`）。`claude` 實作由現 `claudeProvider.ts` 主體搬遷、新增 `codex` 實作；`providers/index.ts` 以 `selectProvider(env)` dispatch。原 `claudeProvider.ts` 降為 re-export shim 以保持既有 import 不動。工具鎖由具體字串清單 `disallowedTools` 抽象成布林 `readonly`，各 provider 自行翻譯成原生 flag。

**Tech Stack:** TypeScript、Next.js（App Router）、Node `child_process.spawn` + `readline`、Vitest（jsdom）、bun。

---

## 設計來源

依據 `docs/superpowers/specs/2026-05-29-codex-provider-design.md`（狀態：Approved）。執行本計畫前不必重讀規格，所有必要內容已內聯於各 task。

## 兩個必須知道的關鍵決策（與規格細節的偏差）

**決策 A — `readonly` 翻譯出的 disallowed 清單保留 `Read`。**
規格 §6 的 `DEFAULT_DISALLOWED` 程式碼片段「漏掉」了 `Read`，但旁註寫「保留 Read，與現行 `DRAFT_TOOL_LOCK` 行為等價」。實際讀現行碼：`draftGenerator.ts` 的 `DRAFT_TOOL_LOCK` 與 `actionRegistry.ts` 的 `FULL_TOOL_LOCK` **都包含 `Read`**（即現行行為是「禁止 Read」）。規格 §14 驗收條件要求「`VECTOR_AGENT` 未設時行為與現況等價、既有測試全綠」。因此本計畫的 `DEFAULT_DISALLOWED` **包含 `Read`**（11 項，與現行 `FULL_TOOL_LOCK` 完全相同）。這是對 §6 程式碼片段的刻意偏差，由 §14 驗收條件背書。

**決策 B — Codex 事件 `type` 名稱必須先用真實輸出校正。**
規格 §7.2 列的事件名（`agent_message` / `agent_message_delta` / `task_complete` / `error`）可能來自舊版 codex。新版 `@openai/codex` 的 `exec --json` 可能改用 `item.completed` 等不同 schema，且若同時累積 `agent_message`（完整）與 `agent_message_delta`（增量）會造成文字重複。整個功能的 happy path 取決於事件名是否正確——單元測試用自製 fixture 會「假性通過」而掩蓋此問題。因此 **Task 3 的第一步是擷取真實 `codex exec --json` 輸出**，據此校正 parser case 與測試 fixture，再完成實作。預設策略：只累積「完整訊息」事件、忽略 delta，以避免重複。

---

## File Structure

完成後 `src/features/spec-wizard/services/localAgent/` 的相關檔案：

| 檔案 | 責任 |
| --- | --- |
| `providers/types.ts` | 新增。`AgentProvider` interface、`SpawnAgentOptions`（含 `readonly`）、`SpawnAgentResult`。 |
| `providers/claude.ts` | 新增。由現 `claudeProvider.ts` 主體搬遷；`readonly` → `--disallowed-tools`；export `claudeProvider` 與 `parseStreamJsonLine`。 |
| `providers/codex.ts` | 新增。`parseCodexJsonLine` + `codexProvider`。 |
| `providers/index.ts` | 新增。`selectProvider(env)` + `spawnAgent` dispatch + `warnOnce`。 |
| `claudeProvider.ts` | 改為 re-export shim：對外 export `spawnAgent` / `selectProvider` / `parseStreamJsonLine` / 型別。不含實作。 |
| `actionRegistry.ts` | `ActionDefinition.disallowedTools: string[]` → `readonly: boolean`；移除 `FULL_TOOL_LOCK`。 |
| `actionRunner.ts` | spawn 改傳 `readonly: action.readonly`。 |
| `draftGenerator.ts` | 移除 `DRAFT_TOOL_LOCK`；spawn 改傳 `readonly: true`。 |

`AGENTS.md`：Commands 一節加 `VECTOR_AGENT` 用法；Repository Skills 一節改寫 `vector-pipeline-b` 條目為雙 agent 觸發指引。

`.agents/skills/vector-pipeline-b/SKILL.md`：**不動**（維持單一 source of truth）。

新測試：`__tests__/codexProvider.test.ts`、`__tests__/providerSelector.test.ts`。
改動測試：`__tests__/claudeProvider.test.ts`、`__tests__/draftGenerator.test.ts`、`__tests__/actionRunner.test.ts`、`__tests__/actionRegistry.test.ts`。

---

## Task 1: 建立 provider 型別模組

純型別檔，獨立可編譯。為後續所有 task 的契約基礎。

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/providers/types.ts`

- [ ] **Step 1: 建立 `providers/types.ts`**

```ts
export type SpawnAgentOptions = {
  prompt: string
  cwd: string
  /** true = 禁止寫入 / 執行外部命令（取代舊的 disallowedTools 字串清單）。 */
  readonly?: boolean
  signal?: AbortSignal
  spawn?: typeof import("node:child_process").spawn
  /** 測試用覆寫；預設由各 provider 決定（"claude" / "codex"）。 */
  binPath?: string
}

export type SpawnAgentResult = {
  text: string
  exitCode: number
}

export interface AgentProvider {
  readonly name: "claude" | "codex"
  spawn(opts: SpawnAgentOptions): Promise<SpawnAgentResult>
}
```

- [ ] **Step 2: 型別檢查通過**

Run: `npx tsc --noEmit`
Expected: 無錯誤（此檔目前尚無 import 它的程式，純新增不影響既有編譯）。

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/providers/types.ts
git commit -m "feat: [local-agent] add AgentProvider provider 型別契約"
```

---

## Task 2: 搬遷 Claude provider 並把工具鎖抽象成 `readonly`

把 `claudeProvider.ts` 實作搬到 `providers/claude.ts`，建立 dispatch，將 `claudeProvider.ts` 降為 shim，並把 `disallowedTools` 字串清單全面改成 `readonly: boolean`。此 task 結束時**全部既有測試必須綠**。

採「先改測試契約（RED）→ 實作（GREEN）」順序。本 task 改動較大但必須原子落地以維持綠燈；步驟細拆如下。

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/providers/claude.ts`
- Create: `src/features/spec-wizard/services/localAgent/providers/index.ts`
- Modify: `src/features/spec-wizard/services/localAgent/claudeProvider.ts`（整檔改為 shim）
- Modify: `src/features/spec-wizard/services/localAgent/actionRegistry.ts`
- Modify: `src/features/spec-wizard/services/localAgent/actionRunner.ts:36-41`
- Modify: `src/features/spec-wizard/services/localAgent/draftGenerator.ts`
- Test: `src/features/spec-wizard/__tests__/claudeProvider.test.ts`（改 spawnAgent 區段）
- Test: `src/features/spec-wizard/__tests__/draftGenerator.test.ts:86-88`
- Test: `src/features/spec-wizard/__tests__/actionRunner.test.ts:30`
- Test: `src/features/spec-wizard/__tests__/actionRegistry.test.ts:22-34`

- [ ] **Step 1: 改寫 `claudeProvider.test.ts` 的 `spawnAgent` 測試契約（RED）**

`parseStreamJsonLine` 的 describe 區段（第 6–115 行）**完全不動**。只替換 `describe("spawnAgent", ...)` 區段（第 147–249 行）為以下內容——把 `disallowedTools` 入參改為 `readonly`，並斷言 `readonly: true` 時 argv 帶有完整 11 項 disallowed 清單（含 `Read`，鎖定行為等價）。`makeFakeChildForSpawnAgent` helper（第 117–145 行）保留不動。

```ts
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
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeChildForSpawnAgent(lines))
    const result = await spawnAgent({
      prompt: "do thing",
      cwd: "/tmp",
      readonly: true,
      spawn: fakeSpawn as never
    })
    expect(result.text).toBe("hello world")
    expect(result.exitCode).toBe(0)
  })

  it("passes --disallowed-tools with the full lock list (incl Read) when readonly", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(
        makeFakeChildForSpawnAgent([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
      )
    await spawnAgent({
      prompt: "do thing",
      cwd: "/tmp",
      readonly: true,
      spawn: fakeSpawn as never
    })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    const idx = argv.indexOf("--disallowed-tools")
    expect(idx).toBeGreaterThanOrEqual(0)
    const list = argv[idx + 1].split(",")
    for (const tool of ["Bash", "Read", "Edit", "Write", "MultiEdit", "WebFetch", "WebSearch", "NotebookEdit", "TodoWrite", "Glob", "Grep"]) {
      expect(list).toContain(tool)
    }
  })

  it("writes prompt to child stdin and does not include it in argv", async () => {
    const child = makeFakeChildForSpawnAgent([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await spawnAgent({
      prompt: "PROMPT-PAYLOAD",
      cwd: "/tmp",
      readonly: true,
      spawn: fakeSpawn as never
    })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    expect(argv).not.toContain("PROMPT-PAYLOAD")
    expect(child.stdinChunks).toEqual(["PROMPT-PAYLOAD"])
  })

  it("does not pass --disallowed-tools when readonly is not set", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(
        makeFakeChildForSpawnAgent([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
      )
    await spawnAgent({
      prompt: "x",
      cwd: "/tmp",
      spawn: fakeSpawn as never
    })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    expect(argv).not.toContain("--disallowed-tools")
  })

  it("throws on non-zero exit with stderr message", async () => {
    const child = makeFakeChildForSpawnAgent([], 1)
    child.stderr = Readable.from(["fatal error\n"])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await expect(
      spawnAgent({ prompt: "x", cwd: "/tmp", readonly: true, spawn: fakeSpawn as never })
    ).rejects.toThrow(/fatal error|exited with code 1/)
  })

  it("rejects when signal fires before spawn", async () => {
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeChildForSpawnAgent([]))
    const ac = new AbortController()
    ac.abort()
    await expect(
      spawnAgent({
        prompt: "x",
        cwd: "/tmp",
        readonly: true,
        spawn: fakeSpawn as never,
        signal: ac.signal
      })
    ).rejects.toThrow(/abort/i)
  })
})
```

- [ ] **Step 2: 改寫 `draftGenerator.test.ts` 的 disallowedTools 斷言（RED）**

把第 86–88 行的迴圈斷言：

```ts
    for (const tool of ["Bash", "Edit", "Write", "MultiEdit", "WebFetch"]) {
      expect(call.disallowedTools).toContain(tool)
    }
```

替換為：

```ts
    expect(call.readonly).toBe(true)
```

- [ ] **Step 3: 改寫 `actionRunner.test.ts` 的 disallowedTools 斷言（RED）**

把第 30 行：

```ts
    expect(call.disallowedTools).toContain("Bash")
```

替換為：

```ts
    expect(call.readonly).toBe(true)
```

- [ ] **Step 4: 改寫 `actionRegistry.test.ts` 的工具鎖測試（RED）**

把第 22–34 行的兩個 `it`（`"all stories actions have a non-empty disallowedTools list"` 與 `"disallowedTools includes Bash, Read, Edit at minimum"`）整段替換為單一測試：

```ts
  it("all stories actions are readonly (tool-locked)", () => {
    const actions = getActionsForStep("stories")
    expect(actions.every((a) => a.readonly === true)).toBe(true)
  })
```

其餘測試（mutationKind、registers 3 actions 等）不動。

- [ ] **Step 5: 確認測試現在為 RED**

Run: `bun run test`
Expected: FAIL。錯誤來自 `readonly` 尚未實作、`disallowedTools` 仍存在等型別/斷言不符（例如 `SpawnAgentOptions` 仍只有 `disallowedTools`）。

- [ ] **Step 6: 建立 `providers/claude.ts`（搬遷實作 + readonly 翻譯）**

由現 `claudeProvider.ts` 主體搬遷。`parseStreamJsonLine` 與其所有 helper（`asString` / `flattenToolResultContent` / `StreamJsonContentBlock` / `StreamJsonLine`）原樣搬入並 `export parseStreamJsonLine`。spawn 邏輯改為從 `opts.readonly` 推導 disallowed 清單，並包成 `claudeProvider` 物件。

```ts
import { spawn as defaultSpawn, type ChildProcess } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentEvent } from "../types"
import type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"

type StreamJsonContentBlock = {
  type: string
  text?: unknown
  id?: unknown
  name?: unknown
  input?: unknown
  tool_use_id?: unknown
  content?: unknown
  is_error?: unknown
}

type StreamJsonLine = {
  type?: string
  subtype?: string
  session_id?: unknown
  cwd?: unknown
  model?: unknown
  message?: { content?: StreamJsonContentBlock[] }
  is_error?: unknown
  duration_ms?: unknown
  num_turns?: unknown
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function flattenToolResultContent(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block && typeof block === "object" && (block as { type?: string }).type === "text") {
          const text = (block as { text?: unknown }).text
          return typeof text === "string" ? text : ""
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  return content == null ? "" : JSON.stringify(content)
}

export function parseStreamJsonLine(line: string): AgentEvent[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  let parsed: StreamJsonLine
  try {
    parsed = JSON.parse(trimmed) as StreamJsonLine
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") return []

  switch (parsed.type) {
    case "system": {
      if (parsed.subtype !== "init") return []
      const sessionId = asString(parsed.session_id)
      const cwd = asString(parsed.cwd)
      if (!sessionId || !cwd) return []
      const model = asString(parsed.model)
      return [{ type: "system_init", sessionId, cwd, ...(model ? { model } : {}) }]
    }
    case "assistant": {
      const blocks = parsed.message?.content ?? []
      const events: AgentEvent[] = []
      for (const block of blocks) {
        if (block.type === "text" && typeof block.text === "string") {
          events.push({ type: "assistant_text", text: block.text })
        } else if (block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string") {
          events.push({ type: "tool_use", id: block.id, name: block.name, input: block.input })
        }
      }
      return events
    }
    case "user": {
      const blocks = parsed.message?.content ?? []
      const events: AgentEvent[] = []
      for (const block of blocks) {
        if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
          events.push({
            type: "tool_result",
            toolUseId: block.tool_use_id,
            isError: Boolean(block.is_error),
            content: flattenToolResultContent(block.content)
          })
        }
      }
      return events
    }
    case "result": {
      const sessionId = asString(parsed.session_id) ?? ""
      const event: AgentEvent = {
        type: "result",
        sessionId,
        isError: Boolean(parsed.is_error),
        ...(typeof parsed.duration_ms === "number" ? { durationMs: parsed.duration_ms } : {}),
        ...(typeof parsed.num_turns === "number" ? { numTurns: parsed.num_turns } : {})
      }
      return [event]
    }
    default:
      return []
  }
}

// 決策 A：保留 Read，與現行 FULL_TOOL_LOCK / DRAFT_TOOL_LOCK 完全相同（11 項）。
const DEFAULT_DISALLOWED = [
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

async function spawnClaude(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  if (opts.signal?.aborted) {
    throw new Error("Aborted before start")
  }

  const spawn = opts.spawn ?? defaultSpawn
  const binPath = opts.binPath ?? "claude"

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
  if (opts.readonly) {
    args.push("--disallowed-tools", DEFAULT_DISALLOWED.join(","))
  }

  const child = spawn(binPath, args, {
    cwd: opts.cwd,
    stdio: ["pipe", "pipe", "pipe"]
  }) as ChildProcess

  if (child.stdin) {
    child.stdin.end(opts.prompt)
  }

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

export const claudeProvider: AgentProvider = {
  name: "claude",
  spawn: spawnClaude
}
```

- [ ] **Step 7: 建立 `providers/index.ts`（dispatch，先永遠回 claude）**

此版 `selectProvider` 尚未讀 env（Task 4 才接上），但 `spawnAgent` dispatch 完成。

```ts
import type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
import { claudeProvider } from "./claude"

export function selectProvider(): AgentProvider {
  return claudeProvider
}

export function spawnAgent(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  return selectProvider().spawn(opts)
}

export type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
```

- [ ] **Step 8: 把 `claudeProvider.ts` 整檔改為 re-export shim**

刪除整個檔案內容，替換為：

```ts
// Re-export shim：實作已搬至 ./providers/*。保留此檔以維持既有 import 路徑與測試。
export { spawnAgent, selectProvider } from "./providers"
export { parseStreamJsonLine } from "./providers/claude"
export type { SpawnAgentOptions, SpawnAgentResult } from "./providers/types"
```

- [ ] **Step 9: 更新 `actionRegistry.ts`（`disallowedTools` → `readonly`）**

(a) `ActionDefinition` 型別（第 18–26 行）把 `disallowedTools: string[]` 改為 `readonly: boolean`：

```ts
export type ActionDefinition = {
  id: string
  step: ActionStepId
  labelKey: string
  helpKey: string
  mutationKind: ActionMutationKind
  promptTemplate: (input: { draft: FeatureDraft }) => string
  readonly: boolean
}
```

(b) 移除 `FULL_TOOL_LOCK` 常數（第 45–57 行整段刪除）。

(c) 三個 `registerAction(...)` 呼叫中的 `disallowedTools: FULL_TOOL_LOCK` 全部改為 `readonly: true`（共三處：`stories.rewrite`、`stories.gaps`、`stories.consistency`）。

- [ ] **Step 10: 更新 `actionRunner.ts`（spawn 入參）**

第 36–41 行的 spawn 呼叫，把 `disallowedTools: action.disallowedTools` 改為 `readonly: action.readonly`：

```ts
    const { text } = await spawn({
      prompt,
      cwd: input.cwd,
      readonly: action.readonly,
      signal: input.signal
    })
```

`actionRunner.ts` 第 4–5 行對 `./claudeProvider` 的 import **不變**（shim 仍提供 `SpawnAgentOptions` / `SpawnAgentResult` / `spawnAgent`）。

- [ ] **Step 11: 更新 `draftGenerator.ts`（移除 DRAFT_TOOL_LOCK）**

(a) 刪除 `DRAFT_TOOL_LOCK` 常數（第 21–33 行整段）。

(b) 第 44–49 行 spawn 呼叫，把 `disallowedTools: DRAFT_TOOL_LOCK` 改為 `readonly: true`：

```ts
    const out = await spawn({
      prompt,
      cwd: input.cwd,
      readonly: true,
      signal: input.signal
    })
```

`draftGenerator.ts` 第 3–4 行對 `./claudeProvider` 的 import **不變**。

- [ ] **Step 12: 確認全部測試 GREEN**

Run: `bun run test`
Expected: PASS（含改寫後的 claudeProvider / draftGenerator / actionRunner / actionRegistry 測試，及其餘所有既有測試）。

- [ ] **Step 13: 型別檢查通過**

Run: `npx tsc --noEmit`
Expected: 無錯誤。

- [ ] **Step 14: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/providers/claude.ts \
        src/features/spec-wizard/services/localAgent/providers/index.ts \
        src/features/spec-wizard/services/localAgent/claudeProvider.ts \
        src/features/spec-wizard/services/localAgent/actionRegistry.ts \
        src/features/spec-wizard/services/localAgent/actionRunner.ts \
        src/features/spec-wizard/services/localAgent/draftGenerator.ts \
        src/features/spec-wizard/__tests__/claudeProvider.test.ts \
        src/features/spec-wizard/__tests__/draftGenerator.test.ts \
        src/features/spec-wizard/__tests__/actionRunner.test.ts \
        src/features/spec-wizard/__tests__/actionRegistry.test.ts
git commit -m "refactor: [local-agent] 抽出 provider 層，工具鎖改用 readonly"
```

---

## Task 3: 新增 Codex provider 與事件 parser

新增 `providers/codex.ts`，含 `parseCodexJsonLine` 與 `codexProvider`。**先擷取真實 codex 輸出校正事件名**（決策 B），再寫測試與實作。

**Files:**
- Create: `src/features/spec-wizard/services/localAgent/providers/codex.ts`
- Test: `src/features/spec-wizard/__tests__/codexProvider.test.ts`

- [ ] **Step 1: 擷取真實 `codex exec --json` 輸出以校正事件 schema（決策 B）**

若本機已安裝並登入 `codex`，執行：

Run: `printf '只回覆一個字：hi' | codex exec --skip-git-repo-check --json - 2>/dev/null | head -40`

觀察每行 JSON 的 `type` 欄位與承載文字的欄位名，回答三個問題並據此調整下一步的 parser：
1. 完整 assistant 文字出現在哪個事件？（規格假設 `agent_message`；新版可能是 `item.completed` 且 `item.type === "agent_message"`、文字在 `item.text`。）
2. 是否同時有增量 `*_delta` 事件？若有，**只取完整訊息、忽略 delta**，避免文字重複。
3. 結束事件名為何？（規格假設 `task_complete`；新版可能是 `turn.completed`。）

若本機無 `codex` 或未登入（指令報錯），則本計畫的 parser 程式碼以規格 §7.2 的事件名為基準實作，並在 Task 5 的手動整合驗證時再以真實輸出校正——**務必在 Step 4 的程式碼註解標記「事件名待真實輸出確認」**，避免假性綠燈誤導。

- [ ] **Step 2: 撰寫 `codexProvider.test.ts`（RED）**

fixtures 的事件名應與 Step 1 觀察到的真實輸出一致；若無法擷取，先用規格基準名（如下），並在 Task 5 校正。

```ts
import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"
import { codexProvider, parseCodexJsonLine } from "../services/localAgent/providers/codex"

describe("parseCodexJsonLine", () => {
  it("maps a full assistant message to assistant_text", () => {
    expect(parseCodexJsonLine(JSON.stringify({ type: "agent_message", text: "Hello" }))).toEqual([
      { type: "assistant_text", text: "Hello" }
    ])
  })

  it("maps an error event to error", () => {
    expect(parseCodexJsonLine(JSON.stringify({ type: "error", message: "boom" }))).toEqual([
      { type: "error", message: "boom" }
    ])
  })

  it("maps task completion to a result event", () => {
    expect(parseCodexJsonLine(JSON.stringify({ type: "task_complete" }))).toEqual([
      { type: "result", sessionId: "", isError: false }
    ])
  })

  it("ignores delta and lifecycle events", () => {
    expect(parseCodexJsonLine(JSON.stringify({ type: "agent_message_delta", text: "He" }))).toEqual([])
    expect(parseCodexJsonLine(JSON.stringify({ type: "session_configured", session_id: "x" }))).toEqual([])
    expect(parseCodexJsonLine(JSON.stringify({ type: "task_started" }))).toEqual([])
    expect(parseCodexJsonLine(JSON.stringify({ type: "token_count", input: 10 }))).toEqual([])
  })

  it("ignores blank lines, malformed JSON, and shapes without a type", () => {
    expect(parseCodexJsonLine("")).toEqual([])
    expect(parseCodexJsonLine("not json")).toEqual([])
    expect(parseCodexJsonLine(JSON.stringify({ no: "type" }))).toEqual([])
  })
})

function makeFakeCodexChild(stdoutLines: string[], exitCode = 0) {
  const stdout = Readable.from(stdoutLines.map((l) => `${l}\n`))
  const stderr = Readable.from([])
  const stdinChunks: string[] = []
  const stdin = {
    end(chunk?: string) {
      if (typeof chunk === "string") stdinChunks.push(chunk)
    }
  }
  const child = new EventEmitter() as EventEmitter & {
    stdin: typeof stdin
    stdout: Readable
    stderr: Readable
    killed: boolean
    kill: (sig?: string) => boolean
    stdinChunks: string[]
  }
  child.stdin = stdin
  child.stdout = stdout
  child.stderr = stderr
  child.killed = false
  child.kill = () => {
    child.killed = true
    return true
  }
  child.stdinChunks = stdinChunks
  setTimeout(() => child.emit("close", exitCode), 0)
  return child
}

describe("codexProvider.spawn", () => {
  it("accumulates assistant_text and returns concatenated text", async () => {
    const lines = [
      JSON.stringify({ type: "session_configured", session_id: "s1" }),
      JSON.stringify({ type: "agent_message", text: "hello world" }),
      JSON.stringify({ type: "task_complete" })
    ]
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeCodexChild(lines))
    const result = await codexProvider.spawn({
      prompt: "do thing",
      cwd: "/tmp",
      readonly: true,
      spawn: fakeSpawn as never
    })
    expect(result.text).toBe("hello world")
    expect(result.exitCode).toBe(0)
  })

  it("builds the expected argv and uses read-only sandbox when readonly", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(makeFakeCodexChild([JSON.stringify({ type: "task_complete" })]))
    await codexProvider.spawn({
      prompt: "x",
      cwd: "/path/to/project",
      readonly: true,
      spawn: fakeSpawn as never
    })
    const [bin, argv] = fakeSpawn.mock.calls[0]
    expect(bin).toBe("codex")
    expect(argv).toEqual([
      "exec",
      "--cd",
      "/path/to/project",
      "--skip-git-repo-check",
      "--json",
      "--sandbox",
      "read-only",
      "-"
    ])
  })

  it("uses workspace-write sandbox when not readonly", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(makeFakeCodexChild([JSON.stringify({ type: "task_complete" })]))
    await codexProvider.spawn({ prompt: "x", cwd: "/tmp", spawn: fakeSpawn as never })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    const idx = argv.indexOf("--sandbox")
    expect(argv[idx + 1]).toBe("workspace-write")
  })

  it("writes prompt to stdin and not into argv", async () => {
    const child = makeFakeCodexChild([JSON.stringify({ type: "task_complete" })])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await codexProvider.spawn({ prompt: "PROMPT-PAYLOAD", cwd: "/tmp", spawn: fakeSpawn as never })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    expect(argv).not.toContain("PROMPT-PAYLOAD")
    expect(child.stdinChunks).toEqual(["PROMPT-PAYLOAD"])
  })

  it("throws on non-zero exit with stderr message", async () => {
    const child = makeFakeCodexChild([], 1)
    child.stderr = Readable.from(["Not logged in. Run 'codex login'\n"])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await expect(
      codexProvider.spawn({ prompt: "x", cwd: "/tmp", spawn: fakeSpawn as never })
    ).rejects.toThrow(/Not logged in|exited with code 1/)
  })

  it("rejects when signal fires before spawn", async () => {
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeCodexChild([]))
    const ac = new AbortController()
    ac.abort()
    await expect(
      codexProvider.spawn({ prompt: "x", cwd: "/tmp", spawn: fakeSpawn as never, signal: ac.signal })
    ).rejects.toThrow(/abort/i)
  })
})
```

- [ ] **Step 3: 確認測試為 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/codexProvider.test.ts`
Expected: FAIL（`providers/codex` 尚不存在，import 失敗）。

- [ ] **Step 4: 建立 `providers/codex.ts`**

> 註：`agent_message` / `agent_message_delta` / `task_complete` 等事件名以規格 §7.2 為基準；**若 Task 3 Step 1 觀察到的真實 codex 輸出不同，請同步調整下方 switch case 與測試 fixture**。`parseCodexJsonLine` 採「只認得需要的、其餘忽略」策略，故未知 type 一律回 `[]`。為避免重複，**只把完整訊息事件轉成 assistant_text，delta 事件預設忽略**（見 case 註解）。

```ts
import { spawn as defaultSpawn, type ChildProcess } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentEvent } from "../types"
import type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"

type CodexJsonLine = {
  type?: string
  text?: unknown
  message?: unknown
  delta?: unknown
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

export function parseCodexJsonLine(line: string): AgentEvent[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  let parsed: CodexJsonLine
  try {
    parsed = JSON.parse(trimmed) as CodexJsonLine
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") return []

  switch (parsed.type) {
    // 完整 assistant 訊息 → assistant_text。
    // 事件名待真實輸出確認（決策 B）；新版 codex 可能改用 item.completed。
    case "agent_message": {
      const text = asString(parsed.text) ?? asString(parsed.message)
      return text ? [{ type: "assistant_text", text }] : []
    }
    // 增量 delta：預設忽略以避免與完整訊息重複累積。
    // 若真實輸出「只有 delta、無完整訊息」，改成回傳 assistant_text。
    case "agent_message_delta": {
      return []
    }
    case "error": {
      const message = asString(parsed.message) ?? "codex error"
      return [{ type: "error", message }]
    }
    case "task_complete": {
      return [{ type: "result", sessionId: "", isError: false }]
    }
    default:
      return []
  }
}

async function spawnCodex(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  if (opts.signal?.aborted) {
    throw new Error("Aborted before start")
  }

  const spawn = opts.spawn ?? defaultSpawn
  const binPath = opts.binPath ?? "codex"

  const args: string[] = [
    "exec",
    "--cd",
    opts.cwd,
    "--skip-git-repo-check",
    "--json",
    "--sandbox",
    opts.readonly ? "read-only" : "workspace-write",
    "-"
  ]

  const child = spawn(binPath, args, {
    cwd: opts.cwd,
    stdio: ["pipe", "pipe", "pipe"]
  }) as ChildProcess

  if (child.stdin) {
    child.stdin.end(opts.prompt)
  }

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
      throw new Error("codex process produced no stdout stream")
    }
    const rl = createInterface({ input: child.stdout })
    for await (const line of rl) {
      for (const event of parseCodexJsonLine(line)) {
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
      throw new Error(stderrBuf.trim() || `codex exited with code ${code}`)
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

export const codexProvider: AgentProvider = {
  name: "codex",
  spawn: spawnCodex
}
```

- [ ] **Step 5: 確認 codex 測試 GREEN**

Run: `bunx vitest run src/features/spec-wizard/__tests__/codexProvider.test.ts`
Expected: PASS。

- [ ] **Step 6: 型別檢查通過**

Run: `npx tsc --noEmit`
Expected: 無錯誤。

- [ ] **Step 7: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/providers/codex.ts \
        src/features/spec-wizard/__tests__/codexProvider.test.ts
git commit -m "feat: [local-agent] add codex provider 與 JSONL 事件 parser"
```

---

## Task 4: 接上 `VECTOR_AGENT` provider 選擇

把 `providers/index.ts` 的 `selectProvider` 改成依 `VECTOR_AGENT` 環境變數選 provider，亂值 fallback claude 並 `warnOnce`。

**Files:**
- Modify: `src/features/spec-wizard/services/localAgent/providers/index.ts`
- Test: `src/features/spec-wizard/__tests__/providerSelector.test.ts`

- [ ] **Step 1: 撰寫 `providerSelector.test.ts`（RED）**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { selectProvider } from "../services/localAgent/providers"

describe("selectProvider", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it("returns codex when VECTOR_AGENT=codex (case-insensitive)", () => {
    expect(selectProvider({ VECTOR_AGENT: "codex" }).name).toBe("codex")
    expect(selectProvider({ VECTOR_AGENT: "Codex" }).name).toBe("codex")
  })

  it("returns claude when VECTOR_AGENT=claude, empty, or unset", () => {
    expect(selectProvider({ VECTOR_AGENT: "claude" }).name).toBe("claude")
    expect(selectProvider({ VECTOR_AGENT: "" }).name).toBe("claude")
    expect(selectProvider({}).name).toBe("claude")
  })

  it("falls back to claude on unknown value and warns at most once", () => {
    expect(selectProvider({ VECTOR_AGENT: "gpt" }).name).toBe("claude")
    expect(selectProvider({ VECTOR_AGENT: "bard" }).name).toBe("claude")
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
```

> 注意：`warnOnce` 用 module-level boolean，跨測試會記憶「已警告」。本測試把所有觸發 warn 的 case 放同一個 `it` 並斷言 `toHaveBeenCalledTimes(1)`，即可驗證 once 行為而不受其他測試檔載入順序影響。

- [ ] **Step 2: 確認測試為 RED**

Run: `bunx vitest run src/features/spec-wizard/__tests__/providerSelector.test.ts`
Expected: FAIL（`selectProvider` 目前無參數且永遠回 claude，`{ VECTOR_AGENT: "codex" }` 仍得 claude）。

- [ ] **Step 3: 改寫 `providers/index.ts`**

整檔替換為：

```ts
import type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
import { claudeProvider } from "./claude"
import { codexProvider } from "./codex"

let warned = false
function warnOnce(message: string): void {
  if (warned) return
  warned = true
  console.warn(message)
}

export function selectProvider(env: NodeJS.ProcessEnv = process.env): AgentProvider {
  const raw = env.VECTOR_AGENT?.toLowerCase()
  if (raw === "codex") return codexProvider
  if (raw && raw !== "claude") {
    warnOnce(`Unknown VECTOR_AGENT=${raw}, falling back to claude`)
  }
  return claudeProvider
}

export function spawnAgent(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  return selectProvider().spawn(opts)
}

export type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
```

- [ ] **Step 4: 確認 selector 測試 GREEN**

Run: `bunx vitest run src/features/spec-wizard/__tests__/providerSelector.test.ts`
Expected: PASS。

- [ ] **Step 5: 確認全部測試仍 GREEN**

Run: `bun run test`
Expected: PASS（全部測試，含 Task 2/3 的改動）。

- [ ] **Step 6: 型別檢查通過**

Run: `npx tsc --noEmit`
Expected: 無錯誤。

- [ ] **Step 7: Commit**

```bash
git add src/features/spec-wizard/services/localAgent/providers/index.ts \
        src/features/spec-wizard/__tests__/providerSelector.test.ts
git commit -m "feat: [local-agent] 以 VECTOR_AGENT 選擇 provider"
```

---

## Task 5: 更新 AGENTS.md（環境變數 + 雙 agent skill 觸發）

文件變更，無測試。兩處編輯。

**Files:**
- Modify: `AGENTS.md:17`（Commands 一節）
- Modify: `AGENTS.md:105`（Repository Skills 一節）

- [ ] **Step 1: 在 Commands 程式碼區塊加 `VECTOR_AGENT` 用法**

把 `AGENTS.md` 第 17 行：

```
bun run dev              # next dev
```

替換為：

```
bun run dev              # next dev（in-app local agent 預設用 claude）
VECTOR_AGENT=codex bun run dev   # 改用 codex CLI 跑 AI 草稿 / WizardActionPanel actions
```

- [ ] **Step 2: 改寫 Repository Skills 的 `vector-pipeline-b` 條目為雙 agent 觸發指引**

把 `AGENTS.md` 第 105 行（`- `.agents/skills/vector-pipeline-b/` — Walk a system idea ...` 整行）替換為：

```md
- `.agents/skills/vector-pipeline-b/` — Path B 方法論四階段流水線（Frame → Decompose → Slice → Handoff），產出與 Vector wizard Draft Manager 相容的 `feature-seed.json`。
  - **Claude Code**：以 skill 形式自動載入，使用者可請求「跑 vector-pipeline-b」或自然語句呼叫，agent 直接執行。
  - **Codex CLI**：不會自動載入；當使用者要求跑 Path B / 方法論 pipeline 時，請 Read `.agents/skills/vector-pipeline-b/SKILL.md` 並依其指示執行（含 stage-1～4 stub 與 `docs/methodology/stages/*/agent-script.md`）。
```

- [ ] **Step 3: 確認 build/lint 不受影響**

Run: `bun run lint`
Expected: PASS（純文件變更，不影響 lint）。

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: [agents] 加 VECTOR_AGENT 用法與 vector-pipeline-b 雙 agent 觸發指引"
```

---

## 手動整合驗證（無法自動化，需本機裝有並登入 codex）

非 e2e 自動化（未裝 / 未登入 codex 會 false negative）。實作完成後手動跑一次：

- [ ] `VECTOR_AGENT=codex bun run dev`，從 SeedPromptSection 觸發「AI 草稿」，確認回傳可解析的 draft JSON。
- [ ] 同上，於 WizardActionPanel 跑 `stories.gaps`（quality_check 類），確認得到 notes 結果。
- [ ] 若上述任一步驟回傳空白 / 解析失敗：以 Task 3 Step 1 的指令擷取真實 `codex exec --json` 輸出，比對 `parseCodexJsonLine` 的 switch case 事件名與承載文字欄位是否一致；不一致則修正 case 與對應測試 fixture，重跑 `bunx vitest run src/features/spec-wizard/__tests__/codexProvider.test.ts`。
- [ ] 不設 `VECTOR_AGENT`（或設 `claude`）重跑同樣兩個流程，確認行為與現況一致。

## 驗收條件對照（規格 §14）

- [ ] `VECTOR_AGENT` 未設時行為與現況等價（spawn `claude`、`DEFAULT_DISALLOWED` 含 Read、`bun run test` 全綠）。— Task 2 + 決策 A。
- [ ] `VECTOR_AGENT=codex` 時 SeedPromptSection AI 草稿能從 codex 取得 draft JSON。— Task 3 + Task 4 + 手動驗證。
- [ ] `bun run test` 全綠，含新增 codex / selector 測試。— Task 3 + Task 4。
- [ ] AGENTS.md 經 Codex 讀過後可引導使用者到 `vector-pipeline-b/SKILL.md`。— Task 5。
