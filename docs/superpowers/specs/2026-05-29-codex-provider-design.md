# Codex Provider 支援設計（Path B 雙 agent 擴充）

**日期**：2026-05-29
**狀態**：Approved（待 plan）
**作者**：carl + Claude
**範圍**：`src/features/spec-wizard/services/localAgent/`、`AGENTS.md`、`.agents/skills/vector-pipeline-b/`

---

## 1. 背景與動機

Path B 目前僅在兩處綁定 Claude：

1. **In-app local agent**：`src/features/spec-wizard/services/localAgent/claudeProvider.ts` 寫死 `spawn("claude", ...)`，被 SeedPromptSection 的「AI 草稿」與 WizardActionPanel 的 quality_check / rewrite 等 action 共用。
2. **方法論 skill**：`.agents/skills/vector-pipeline-b/SKILL.md` 是 Claude Code plugin 結構，Codex CLI 不會自動載入。

需求是讓兩個層面都能改用 Codex CLI（`@openai/codex`）。要求單一 source of truth、不重複 markdown、不在 UI 新增切換選單。

## 2. 範圍

涵蓋：
- 抽出 `AgentProvider` interface，新增 `codexProvider`，以 `VECTOR_AGENT` 環境變數選擇。
- 將 `disallowedTools` 抽象為 `readonly: boolean`，各 provider 自行翻譯成原生 flag。
- 在 `AGENTS.md` 加註雙 agent 觸發說明，讓 Codex 也能找到 Path B skill 入口。

不涵蓋：
- UI 上的 provider switcher。
- `assistService`（mock LLM 適配器）的 provider 抽象，與 spawn CLI 是獨立管線。
- `.codex/prompts/` 同步副本。
- Codex 登入流程偵測（spawn 失敗時直接把 stderr 拋給 user）。

## 3. 目標 / 非目標

**目標**
- `draftGenerator` 與 `actionRunner` 的 import 路徑與函式簽名不變。
- 加新 provider 只需新增一個檔案 + 一段 args/parser，不改動 dispatcher 以外的程式。
- 測試以 spawn mock 為主，不依賴實際 `claude` / `codex` binary。

**非目標**
- 不追求事件級對齊（`tool_use` / `tool_result` 在 Codex 端忽略即可，目前消費端只用 `assistant_text`）。
- 不維護 Codex JSONL schema 的長期相容矩陣；採取「只認得需要的，其餘忽略」策略。

## 4. 架構

### 4.1 目錄結構

```
src/features/spec-wizard/services/localAgent/
├── providers/
│   ├── types.ts          # AgentProvider, SpawnAgentOptions, SpawnAgentResult
│   ├── claude.ts         # 由現 claudeProvider.ts 主體搬遷
│   ├── codex.ts          # 新增
│   └── index.ts          # selectProvider(env) + spawnAgent dispatch
├── claudeProvider.ts     # 改為 re-export shim：export { spawnAgent } from "./providers"
├── actionRunner.ts       # 不動
├── draftGenerator.ts     # 不動（只把 DRAFT_TOOL_LOCK 改成 readonly:true）
├── actionRegistry.ts     # disallowedTools 欄位 → readonly: boolean
├── ...
```

保留 `claudeProvider.ts` 作為 re-export shim 是為了避免動到既有 import 與測試斷言；該檔不再含實作。

### 4.2 資料流

```
draftGenerator / actionRunner
        │  spawnAgent({ prompt, cwd, readonly, signal })
        ▼
providers/index.ts ── selectProvider(process.env.VECTOR_AGENT)
        │
        ├── claude provider ──> spawn("claude", [...claude flags], stdio)
        └── codex provider  ──> spawn("codex", ["exec", ...codex flags], stdio)
                                       │
                                       └── parse JSONL → AgentEvent[]
                                             │
                                             └── 累積 assistant_text → result.text
```

對外仍只回傳 `{ text, exitCode }`。

## 5. Provider 介面契約

`providers/types.ts`：

```ts
export type SpawnAgentOptions = {
  prompt: string
  cwd: string
  readonly?: boolean        // 取代 disallowedTools。true = 禁止寫入/執行外部命令。
  signal?: AbortSignal
  spawn?: typeof import("node:child_process").spawn
  binPath?: string          // 測試用覆寫，預設由 provider 決定（"claude" / "codex"）
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

`providers/index.ts`：

```ts
export function selectProvider(env: NodeJS.ProcessEnv = process.env): AgentProvider {
  const raw = env.VECTOR_AGENT?.toLowerCase()
  if (raw === "codex") return codexProvider
  if (raw && raw !== "claude") warnOnce(`Unknown VECTOR_AGENT=${raw}, falling back to claude`)
  return claudeProvider
}

export function spawnAgent(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  return selectProvider().spawn(opts)
}
```

`warnOnce` 用 module-level boolean 確保多 request 不重複 log。

## 6. Claude provider（搬遷）

`providers/claude.ts` 保留現行邏輯，只改兩處：

1. args 組合改由 `readonly` 推導：
   ```ts
   const DEFAULT_DISALLOWED = [
     "Bash", "Edit", "Write", "MultiEdit",
     "WebFetch", "WebSearch", "NotebookEdit",
     "TodoWrite", "Glob", "Grep"
   ]
   if (opts.readonly) {
     args.push("--disallowed-tools", DEFAULT_DISALLOWED.join(","))
   }
   ```
   注意保留 `Read`，與現行 `DRAFT_TOOL_LOCK` 行為等價。
2. binPath 預設仍為 `"claude"`。

其餘（stream-json 解析、AbortSignal SIGTERM、stderr 收集）原樣搬遷。

## 7. Codex provider（新增）

### 7.1 spawn 參數

```ts
const args = [
  "exec",
  "--cd", opts.cwd,
  "--skip-git-repo-check",
  "--json",
  "--sandbox", opts.readonly ? "read-only" : "workspace-write",
  "-"   // prompt from stdin
]
```

- `exec`：非互動 headless 子命令（對應 Claude `--print`）。
- `--cd`：codex 的工作目錄旗標（codex 的 `--add-dir` 語意是「額外可寫目錄」，不適合作為主 cwd）。
- `--skip-git-repo-check`：使用者提供的 cwd 不保證是 git repo。
- `--json`：JSONL 事件串流。
- `--sandbox`：`read-only` = 禁止寫檔與執行命令；`workspace-write` = 預設可在 cwd 內寫檔。

`spawn` 仍是 `stdio: ["pipe", "pipe", "pipe"]`，prompt 寫入 stdin 後 end。

### 7.2 事件解析

新增 `parseCodexJsonLine(line: string): AgentEvent[]`：

- 解析每行 JSON；非 JSON 或無 `type` 欄位 → 回 `[]`。
- 認得的 type（轉成現有 `AgentEvent`）：
  - `agent_message` / `agent_message_delta`（含 text 欄位）→ `{ type: "assistant_text", text }`
  - `error` → `{ type: "error", message }`
  - `task_complete` → `{ type: "result", sessionId: "", isError: false }`
- 其他 event（session_configured / task_started / token_count 等等）一律忽略。

`spawn` 的累積流程仍是：對每行 event 跑 `if (event.type === "assistant_text") text += event.text`，與 Claude 端共用。

### 7.3 錯誤與中斷

- stderr 收進 buffer；exit code ≠ 0 時 throw `stderrBuf.trim() || "codex exited with code N"`。
- AbortSignal：SIGTERM，與 Claude provider 一致。
- 若 `codex` 未登入，spawn 本身會 exit ≠ 0 並把 `Not logged in. Run 'codex login'` 之類訊息寫到 stderr，直接透傳即可。

## 8. 設定與環境變數

新環境變數：

| 變數 | 值 | 預設 | 說明 |
|------|----|------|------|
| `VECTOR_AGENT` | `claude` / `codex` | `claude` | 決定 in-app spawn 哪個 CLI |

設定方式（寫進 `AGENTS.md` 的 Commands 一節）：

```bash
# 預設用 claude
bun run dev

# 切換到 codex
VECTOR_AGENT=codex bun run dev
```

不新增 `.env.example`；專案目前無此檔，避免引入新慣例。

## 9. AGENTS.md「Repository Skills」段落改寫

把 `vector-pipeline-b` 條目從單句說明擴成雙 agent 觸發指引：

```md
- `.agents/skills/vector-pipeline-b/` — Path B 方法論四階段流水線
  (Frame → Decompose → Slice → Handoff)，產出 `feature-seed.json`。
  - **Claude Code**：以 skill 形式自動載入，使用者可請求
    「跑 vector-pipeline-b」或自然語句呼叫，agent 直接執行。
  - **Codex CLI**：不會自動載入；當使用者要求跑 Path B / 方法論
    pipeline 時，請 Read `.agents/skills/vector-pipeline-b/SKILL.md`
    並依其指示執行（含 stage-1～4 stub 與
    `docs/methodology/stages/*/agent-script.md`）。
```

skill 本身 markdown 內容不動，維持單一 source of truth。

## 10. 對既有 API 與測試的影響

**改名 / 移除**
- `actionRegistry.ts` 各 action 的 `disallowedTools: string[]` → `readonly: true`。
- `draftGenerator.ts` 移除 `DRAFT_TOOL_LOCK` 常數，spawn 改傳 `readonly: true`。
- `actionRunner.ts` spawn 改傳 `readonly: action.readonly`。

**簽名不變**
- `spawnAgent(opts)` 對 `draftGenerator` / `actionRunner` 的呼叫面只把 `disallowedTools` 改成 `readonly`。
- `claudeProvider.ts` 仍可 `import { spawnAgent } from ".../claudeProvider"`，舊測試斷言基本可沿用。

**新測試**
- `__tests__/codexProvider.test.ts`
- `__tests__/providerSelector.test.ts`

**改動的測試**
- `__tests__/claudeProvider.test.ts`：import 路徑若移動需同步；功能斷言不變。
- `__tests__/draftGenerator.test.ts`、`__tests__/actionRunner.test.ts`：`disallowedTools` 斷言改為 `readonly: true`。
- `actionRegistry` 若有單元測試需同步調整欄位。

## 11. 測試策略

**單元測試**

`codexProvider.test.ts`：
- `parseCodexJsonLine`：4–5 種樣本（session_configured / agent_message_delta / agent_message / task_complete / error）；無效 JSON 不 crash；不認得的 type 回 `[]`。
- `spawnAgent`（mock spawn）：args 完整等於預期、prompt 寫入 stdin、`--sandbox` 切換、exit ≠ 0 throw stderr、AbortSignal 觸發 SIGTERM。

`providerSelector.test.ts`：
- `VECTOR_AGENT=codex` → 回 codex；`claude` / 未設 / `""` → 回 claude。
- 亂值 → fallback claude 且 `console.warn` 僅 fire 一次。

**整合驗證**（手動）
- 設 `VECTOR_AGENT=codex bun run dev`，從 SeedPromptSection 觸發 AI 草稿；確認得到 draft JSON。
- 同上但跑 WizardActionPanel 的 quality_check。

不寫 e2e 自動化（沒裝 codex / 未登入會 false negative）。

## 12. 遷移順序（plan 階段細拆）

1. 建 `providers/types.ts` + `providers/index.ts`（`selectProvider` 先永遠回 claude）。
2. 把 `claudeProvider.ts` 主體搬到 `providers/claude.ts`，原檔改 re-export shim。將 `disallowedTools` 翻譯成 `--disallowed-tools` 並把 `draftGenerator` / `actionRunner` / `actionRegistry` 改用 `readonly`。**此 commit 後所有現有測試應綠**。
3. 新增 `providers/codex.ts` + `parseCodexJsonLine` + 測試。
4. 在 `selectProvider` 接上 `VECTOR_AGENT` 邏輯 + 測試。
5. 更新 `AGENTS.md`（Commands 加 `VECTOR_AGENT`、Repository Skills 改寫 vector-pipeline-b 條目）。

每步為一個 commit，符合專案 `<type>: [<scope>] <subject>` 格式。

## 13. 風險與緩解

| 風險 | 緩解 |
|------|------|
| Codex JSONL schema 未來變動 | parser 只認得需要的 event type，其餘忽略；schema 升級時只需擴一兩個 case |
| `--sandbox read-only` 比 Claude `--disallowed-tools` 更嚴 | 目前 draft / quality_check / rewrite 都不需要讀外部檔；若未來 action 需要寫檔，改傳 `readonly: false` |
| `codex` 未登入 | spawn 自然 exit ≠ 0，stderr 直接透傳；不額外做登入態檢查 |
| 使用者誤打 `VECTOR_AGENT=Codex` 之類大小寫變體 | `selectProvider` 已 `toLowerCase` |
| 既有 import 路徑變動觸發大量測試改動 | 保留 `claudeProvider.ts` re-export shim |

## 14. 驗收條件

- `VECTOR_AGENT` 未設時行為與現況等價（spawn `claude`，全部既有測試綠）。
- `VECTOR_AGENT=codex` 時 SeedPromptSection 的 AI 草稿能成功從 codex 取得 draft JSON。
- `bun run test` 全綠，含新增的 codex/selector 測試。
- AGENTS.md 經 Codex CLI 讀過後，使用者口語請求「跑 Path B」可被 Codex 引導到 `.agents/skills/vector-pipeline-b/SKILL.md`。
