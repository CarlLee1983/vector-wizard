# #6 CLI Import 子命令 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 `vector-wizard` CLI 新增 `import <paths...>` 子命令，讓 Pipeline B 產出的多份 `*.feature-seed.json` 可一次階段化（stage）後，wizard 啟動時自動匯入到 Draft Manager，消除「N 份檔案手動逐一貼進來」的摩擦。

**Architecture:**
- **CLI 端 (`bin/`)** 解析 `import` 子命令、解析路徑（檔案 or 資料夾）、讀檔、做最低限度的 shape 檢查、把所有可用的 draft 寫入 `.vector/import/pending.json`，再 fall through 到既有的「啟動 Next 伺服器」流程。
- **Server 端 (`app/api/import-staged/route.ts`)** 提供單一 `POST` 端點：consume-on-read，讀完 `pending.json` 後立即刪除並回傳 drafts，避免重複匯入。
- **Client 端 (`useStagedImport` hook + `StagedImportToast`)** 在 wizard 首頁掛載時呼叫 POST 一次，把回傳的每份 draft 透過既有 `importDraftJson()` 灌入 draftStore，並以 toast 顯示成功匯入幾份。

**Tech Stack:** Plain ESM JS（`bin/lib/*.mjs`、Node 內建 `fs/promises`）、Next.js App Router Route Handler、React 19 client component、Vitest。

---

## File Structure

| 路徑 | 動作 | 角色 |
|------|------|------|
| `bin/cli.js` | 修改 | 在啟動伺服器之前，先檢查 `argv[2]` 是否為 `import`；是則呼叫 stage flow，再 fall through 啟動伺服器 |
| `bin/lib/parseImportArgs.mjs` | 新增 | 將 `argv` 後綴解析為 `{ command: "import", paths: string[] }` 或 `{ command: "default" }` |
| `bin/lib/resolveSeedFiles.mjs` | 新增 | 將 paths 展開為實際檔案清單；支援 `<file>` 與 `<dir>`（遞迴尋找 `*.feature-seed.json`） |
| `bin/lib/validateSeedShape.mjs` | 新增 | 對每個 JSON 做最小 shape 檢查（與 `draftFromJson` 對齊） |
| `bin/lib/stageImport.mjs` | 新增 | 把通過驗證的 drafts 寫入 `.vector/import/pending.json`（覆寫舊檔） |
| `bin/__tests__/parseImportArgs.test.mjs` | 新增 | unit |
| `bin/__tests__/resolveSeedFiles.test.mjs` | 新增 | unit（用 tmp dir） |
| `bin/__tests__/validateSeedShape.test.mjs` | 新增 | unit |
| `bin/__tests__/stageImport.test.mjs` | 新增 | unit（用 tmp dir） |
| `app/api/import-staged/route.ts` | 新增 | thin handler：呼叫 `consumeStagedDrafts()`，回 `{ drafts }` |
| `src/features/spec-wizard/services/stagedImportStore.ts` | 新增 | server-side 純函式 `consumeStagedDrafts(baseDir)`：讀檔→刪檔→回傳 |
| `src/features/spec-wizard/__tests__/stagedImportStore.test.ts` | 新增 | unit（用 tmp dir） |
| `src/features/spec-wizard/__tests__/importStagedRoute.test.ts` | 新增 | route smoke test |
| `src/features/spec-wizard/hooks/useStagedImport.ts` | 新增 | client hook：mount 時 POST `/api/import-staged`，每份 draft 餵給 `importDraftJson`，曝露 `{ status, importedCount, error }` |
| `src/features/spec-wizard/__tests__/useStagedImport.test.tsx` | 新增 | hook 行為測試（fetch mock + draftStore 整合） |
| `src/features/spec-wizard/components/StagedImportToast.tsx` | 新增 | 顯示成功 / 失敗訊息的單檔 toast |
| `src/features/spec-wizard/components/AppShell.tsx` | 修改 | 掛載 `<StagedImportToast />` |
| `src/features/spec-wizard/i18n/messageKeys.ts` | 修改 | 新增 5 條 `stagedImport.*` keys |
| `src/features/spec-wizard/i18n/dictionaries.ts` | 修改 | `zh-TW` / `en` 對應翻譯 |
| `docs/methodology/pipeline-b.md` | 修改 | 「進入下一步：Vector wizard」段落新增 CLI 路徑 |
| `README.md` / `README.zh-TW.md` | 修改 | CLI usage 區段加入 `import` 子命令 |
| `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md` | 修改 | 將 #6 標記為 ✅ 已實作 (2026-04-29) |

### 共享路徑常數

`.vector/import/pending.json` 是 CLI 與 server 之間唯一的契約。為避免兩邊不同步，路徑寫死在兩處並各自加註解互相指認：

- `bin/lib/stageImport.mjs` 的常數 `STAGED_IMPORT_RELATIVE = ".vector/import/pending.json"`
- `src/features/spec-wizard/services/stagedImportStore.ts` 的常數 `STAGED_IMPORT_RELATIVE = ".vector/import/pending.json"`

雙方都使用 `path.join(baseDir, STAGED_IMPORT_RELATIVE)`，`baseDir` 都來自 `process.cwd()`。

### Staging 檔案 schema

```jsonc
{
  "stagedAt": "2026-04-29T12:34:56.000Z",
  "drafts": [
    {
      "sourcePath": "docs/methodology/artifacts/seeds/FT-002-billing-engine.feature-seed.json",
      "draft": { /* 原 feature-seed JSON 內容，未經修改 */ }
    }
  ]
}
```

`drafts[].draft` 直接是 `feature-seed.json` 的原始物件——server 只負責原樣回傳，client 端用 `JSON.stringify(draft.draft)` 餵給 `importDraftJson()`，由既有的 `normalizeDraft` 處理欄位升級。

---

## Task Breakdown

### Task 1: 建立 bin/lib 骨架

**Files:**
- Create: `bin/lib/.gitkeep`
- Create: `bin/__tests__/.gitkeep`

- [ ] **Step 1: 建立目錄並 commit 空骨架**

```bash
mkdir -p bin/lib bin/__tests__
touch bin/lib/.gitkeep bin/__tests__/.gitkeep
```

- [ ] **Step 2: 確認 vitest 會收集 bin 目錄底下的 .test.mjs**

Run: `bunx vitest run --reporter=verbose bin/ 2>&1 | head -20`

Expected: vitest 報「No tests found」（接受 — 後續 task 會新增）。如果報 config 錯誤先處理。

- [ ] **Step 3: Commit**

```bash
git add bin/lib bin/__tests__
git commit -m "chore: [cli-import] 新增 bin/lib 與 bin/__tests__ 骨架 (#6)"
```

---

### Task 2: parseImportArgs — 解析 CLI 子命令

**Files:**
- Create: `bin/lib/parseImportArgs.mjs`
- Test: `bin/__tests__/parseImportArgs.test.mjs`

- [ ] **Step 1: 寫失敗測試**

```js
// bin/__tests__/parseImportArgs.test.mjs
import { describe, expect, it } from "vitest"
import { parseImportArgs } from "../lib/parseImportArgs.mjs"

describe("parseImportArgs", () => {
  it("returns default command when argv has no extra arg", () => {
    expect(parseImportArgs(["node", "cli.js"])).toEqual({ command: "default" })
  })

  it("returns default command for unknown subcommand", () => {
    expect(parseImportArgs(["node", "cli.js", "build"])).toEqual({ command: "default" })
  })

  it("parses 'import' with one path", () => {
    const result = parseImportArgs(["node", "cli.js", "import", "./a.json"])
    expect(result).toEqual({ command: "import", paths: ["./a.json"] })
  })

  it("parses 'import' with multiple paths", () => {
    const result = parseImportArgs(["node", "cli.js", "import", "./a.json", "./b.json", "./seeds/"])
    expect(result).toEqual({ command: "import", paths: ["./a.json", "./b.json", "./seeds/"] })
  })

  it("returns import command with empty paths when no path provided", () => {
    expect(parseImportArgs(["node", "cli.js", "import"])).toEqual({ command: "import", paths: [] })
  })
})
```

- [ ] **Step 2: 跑測試確認 fail**

Run: `bunx vitest run bin/__tests__/parseImportArgs.test.mjs`

Expected: FAIL — `parseImportArgs` 尚未實作。

- [ ] **Step 3: 實作**

```js
// bin/lib/parseImportArgs.mjs
export function parseImportArgs(argv) {
  const args = argv.slice(2)
  if (args.length === 0) return { command: "default" }
  if (args[0] !== "import") return { command: "default" }
  return { command: "import", paths: args.slice(1) }
}
```

- [ ] **Step 4: 跑測試確認 pass**

Run: `bunx vitest run bin/__tests__/parseImportArgs.test.mjs`

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add bin/lib/parseImportArgs.mjs bin/__tests__/parseImportArgs.test.mjs
git commit -m "feat: [cli-import] parseImportArgs 解析 import 子命令 (#6)"
```

---

### Task 3: validateSeedShape — 最小 JSON shape 檢查

**Files:**
- Create: `bin/lib/validateSeedShape.mjs`
- Test: `bin/__tests__/validateSeedShape.test.mjs`

對齊 `draftFromJson` 的最低條件：必須是物件、有 `metadata`、有 `goal`、`epics` 是陣列。其他欄位由 server 端 `normalizeDraft` 補齊。

- [ ] **Step 1: 寫失敗測試**

```js
// bin/__tests__/validateSeedShape.test.mjs
import { describe, expect, it } from "vitest"
import { validateSeedShape } from "../lib/validateSeedShape.mjs"

describe("validateSeedShape", () => {
  const baseValid = {
    metadata: { title: "FT-001", locale: "zh-TW" },
    goal: { statement: "x", successSignals: [] },
    epics: [
      {
        id: "EP-001",
        title: "e",
        stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
      }
    ]
  }

  it("accepts a minimal valid feature-seed shape", () => {
    expect(validateSeedShape(baseValid)).toEqual({ valid: true })
  })

  it("rejects null", () => {
    expect(validateSeedShape(null)).toEqual({ valid: false, reason: "not_object" })
  })

  it("rejects non-object input", () => {
    expect(validateSeedShape("string")).toEqual({ valid: false, reason: "not_object" })
    expect(validateSeedShape(42)).toEqual({ valid: false, reason: "not_object" })
  })

  it("rejects when metadata is missing", () => {
    const { metadata: _omit, ...rest } = baseValid
    expect(validateSeedShape(rest)).toEqual({ valid: false, reason: "missing_metadata" })
  })

  it("rejects when goal is missing", () => {
    const { goal: _omit, ...rest } = baseValid
    expect(validateSeedShape(rest)).toEqual({ valid: false, reason: "missing_goal" })
  })

  it("rejects when epics is not an array", () => {
    expect(validateSeedShape({ ...baseValid, epics: "nope" })).toEqual({ valid: false, reason: "missing_epics" })
  })
})
```

- [ ] **Step 2: 跑測試確認 fail**

Run: `bunx vitest run bin/__tests__/validateSeedShape.test.mjs`

Expected: FAIL — module not found.

- [ ] **Step 3: 實作**

```js
// bin/lib/validateSeedShape.mjs
export function validateSeedShape(seed) {
  if (seed == null || typeof seed !== "object" || Array.isArray(seed)) {
    return { valid: false, reason: "not_object" }
  }
  if (seed.metadata == null || typeof seed.metadata !== "object") {
    return { valid: false, reason: "missing_metadata" }
  }
  if (seed.goal == null || typeof seed.goal !== "object") {
    return { valid: false, reason: "missing_goal" }
  }
  if (!Array.isArray(seed.epics)) {
    return { valid: false, reason: "missing_epics" }
  }
  return { valid: true }
}
```

- [ ] **Step 4: 跑測試確認 pass**

Run: `bunx vitest run bin/__tests__/validateSeedShape.test.mjs`

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add bin/lib/validateSeedShape.mjs bin/__tests__/validateSeedShape.test.mjs
git commit -m "feat: [cli-import] validateSeedShape 最小 shape 檢查 (#6)"
```

---

### Task 4: resolveSeedFiles — 路徑/資料夾解析

**Files:**
- Create: `bin/lib/resolveSeedFiles.mjs`
- Test: `bin/__tests__/resolveSeedFiles.test.mjs`

支援：
- 檔案路徑 → 直接收錄。
- 資料夾路徑 → 遞迴蒐集 `*.feature-seed.json`。
- 不存在的路徑 → 加入 `missing` 由呼叫端決定如何處理。

- [ ] **Step 1: 寫失敗測試**

```js
// bin/__tests__/resolveSeedFiles.test.mjs
import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { resolveSeedFiles } from "../lib/resolveSeedFiles.mjs"

describe("resolveSeedFiles", () => {
  let dir

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "vector-cli-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("returns a single feature-seed file as-is", async () => {
    const file = join(dir, "a.feature-seed.json")
    await writeFile(file, "{}")
    const result = await resolveSeedFiles([file])
    expect(result.files).toEqual([file])
    expect(result.missing).toEqual([])
  })

  it("recurses into a directory, picks only *.feature-seed.json", async () => {
    await writeFile(join(dir, "FT-001.feature-seed.json"), "{}")
    await writeFile(join(dir, "FT-002.feature-seed.json"), "{}")
    await writeFile(join(dir, "ignore.json"), "{}")
    await writeFile(join(dir, "notes.md"), "x")
    const sub = join(dir, "nested")
    await mkdir(sub)
    await writeFile(join(sub, "FT-003.feature-seed.json"), "{}")

    const result = await resolveSeedFiles([dir])

    expect(result.files.sort()).toEqual([
      join(dir, "FT-001.feature-seed.json"),
      join(dir, "FT-002.feature-seed.json"),
      join(sub, "FT-003.feature-seed.json")
    ].sort())
    expect(result.missing).toEqual([])
  })

  it("flags missing paths and returns existing ones", async () => {
    const file = join(dir, "exists.feature-seed.json")
    await writeFile(file, "{}")
    const ghost = join(dir, "ghost.feature-seed.json")
    const result = await resolveSeedFiles([file, ghost])
    expect(result.files).toEqual([file])
    expect(result.missing).toEqual([ghost])
  })

  it("returns empty result for empty input", async () => {
    expect(await resolveSeedFiles([])).toEqual({ files: [], missing: [] })
  })

  it("dedupes when same file is passed twice", async () => {
    const file = join(dir, "dup.feature-seed.json")
    await writeFile(file, "{}")
    const result = await resolveSeedFiles([file, file])
    expect(result.files).toEqual([file])
  })
})
```

- [ ] **Step 2: 跑測試確認 fail**

Run: `bunx vitest run bin/__tests__/resolveSeedFiles.test.mjs`

Expected: FAIL — module not found.

- [ ] **Step 3: 實作**

```js
// bin/lib/resolveSeedFiles.mjs
import { stat, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"

const FEATURE_SEED_SUFFIX = ".feature-seed.json"

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walk(full)))
    } else if (entry.isFile() && entry.name.endsWith(FEATURE_SEED_SUFFIX)) {
      out.push(full)
    }
  }
  return out
}

export async function resolveSeedFiles(paths) {
  const files = []
  const missing = []
  const seen = new Set()

  for (const p of paths) {
    const absolute = resolve(p)
    let info
    try {
      info = await stat(absolute)
    } catch {
      missing.push(p)
      continue
    }
    if (info.isDirectory()) {
      const found = await walk(absolute)
      for (const f of found) {
        if (!seen.has(f)) {
          seen.add(f)
          files.push(f)
        }
      }
    } else if (info.isFile()) {
      if (!seen.has(absolute)) {
        seen.add(absolute)
        files.push(absolute)
      }
    } else {
      missing.push(p)
    }
  }

  return { files, missing }
}
```

- [ ] **Step 4: 跑測試確認 pass**

Run: `bunx vitest run bin/__tests__/resolveSeedFiles.test.mjs`

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add bin/lib/resolveSeedFiles.mjs bin/__tests__/resolveSeedFiles.test.mjs
git commit -m "feat: [cli-import] resolveSeedFiles 解析檔案與資料夾 (#6)"
```

---

### Task 5: stageImport — 寫入 .vector/import/pending.json

**Files:**
- Create: `bin/lib/stageImport.mjs`
- Test: `bin/__tests__/stageImport.test.mjs`

- [ ] **Step 1: 寫失敗測試**

```js
// bin/__tests__/stageImport.test.mjs
import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { STAGED_IMPORT_RELATIVE, stageImport } from "../lib/stageImport.mjs"

describe("stageImport", () => {
  let dir

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "vector-stage-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("exposes the canonical relative path constant", () => {
    expect(STAGED_IMPORT_RELATIVE).toBe(".vector/import/pending.json")
  })

  it("writes pending.json with stagedAt and drafts wrapped with sourcePath", async () => {
    const draft1 = { metadata: { title: "Foo" } }
    const draft2 = { metadata: { title: "Bar" } }

    await stageImport({
      baseDir: dir,
      drafts: [
        { sourcePath: "/abs/foo.feature-seed.json", draft: draft1 },
        { sourcePath: "/abs/bar.feature-seed.json", draft: draft2 }
      ]
    })

    const raw = await readFile(join(dir, STAGED_IMPORT_RELATIVE), "utf-8")
    const parsed = JSON.parse(raw)
    expect(typeof parsed.stagedAt).toBe("string")
    expect(new Date(parsed.stagedAt).toString()).not.toBe("Invalid Date")
    expect(parsed.drafts).toEqual([
      { sourcePath: "/abs/foo.feature-seed.json", draft: draft1 },
      { sourcePath: "/abs/bar.feature-seed.json", draft: draft2 }
    ])
  })

  it("creates parent .vector/import directory when missing", async () => {
    await stageImport({ baseDir: dir, drafts: [] })
    const info = await stat(join(dir, ".vector", "import"))
    expect(info.isDirectory()).toBe(true)
  })

  it("overwrites a previous staging file", async () => {
    await stageImport({ baseDir: dir, drafts: [{ sourcePath: "a", draft: { v: 1 } }] })
    await stageImport({ baseDir: dir, drafts: [{ sourcePath: "b", draft: { v: 2 } }] })
    const raw = await readFile(join(dir, STAGED_IMPORT_RELATIVE), "utf-8")
    expect(JSON.parse(raw).drafts).toEqual([{ sourcePath: "b", draft: { v: 2 } }])
  })
})
```

- [ ] **Step 2: 跑測試確認 fail**

Run: `bunx vitest run bin/__tests__/stageImport.test.mjs`

Expected: FAIL — module not found.

- [ ] **Step 3: 實作**

```js
// bin/lib/stageImport.mjs
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

// 與 src/features/spec-wizard/services/stagedImportStore.ts 共用的契約。
// 修改此值時，請同步更新該 TS 模組的 STAGED_IMPORT_RELATIVE。
export const STAGED_IMPORT_RELATIVE = ".vector/import/pending.json"

export async function stageImport({ baseDir, drafts }) {
  const target = join(baseDir, STAGED_IMPORT_RELATIVE)
  await mkdir(dirname(target), { recursive: true })
  const payload = {
    stagedAt: new Date().toISOString(),
    drafts
  }
  await writeFile(target, JSON.stringify(payload, null, 2), "utf-8")
}
```

- [ ] **Step 4: 跑測試確認 pass**

Run: `bunx vitest run bin/__tests__/stageImport.test.mjs`

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add bin/lib/stageImport.mjs bin/__tests__/stageImport.test.mjs
git commit -m "feat: [cli-import] stageImport 寫入 .vector/import/pending.json (#6)"
```

---

### Task 6: 串起 bin/cli.js — 加入 import 子命令分支

**Files:**
- Modify: `bin/cli.js`

不需要新增測試（該檔案是 server orchestrator，含 spawn）。手動驗證即可。

- [ ] **Step 1: 替換 `bin/cli.js` 為含 import 分支的版本**

替換整檔：

```js
#!/usr/bin/env node

import { spawn } from "child_process"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "url"
import { dirname, join, relative } from "path"
import { existsSync } from "fs"

import { parseImportArgs } from "./lib/parseImportArgs.mjs"
import { resolveSeedFiles } from "./lib/resolveSeedFiles.mjs"
import { validateSeedShape } from "./lib/validateSeedShape.mjs"
import { stageImport } from "./lib/stageImport.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, "..")
const cwd = process.cwd()

console.log("\nVector Agile Roadmap Wizard")
console.log("---------------------------")

const parsed = parseImportArgs(process.argv)

if (parsed.command === "import") {
  const success = await runImport(parsed.paths)
  if (!success) {
    process.exit(1)
  }
}

const isProd = existsSync(join(projectRoot, ".next"))
const script = isProd ? "start" : "dev"

console.log(`Mode: ${isProd ? "Production" : "Development"}`)
console.log(`Project Root: ${projectRoot}`)
console.log(`Launching server via ${script}...\n`)

const child = spawn("npm", ["run", script], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true
})

child.on("error", (err) => {
  console.error("Failed to start server:", err.message)
  process.exit(1)
})

async function runImport(paths) {
  if (paths.length === 0) {
    console.error("Usage: npx vector-wizard import <file-or-directory> [...]")
    return false
  }

  const { files, missing } = await resolveSeedFiles(paths)
  for (const m of missing) {
    console.warn(`  ! 路徑不存在或無法讀取，已略過：${m}`)
  }
  if (files.length === 0) {
    console.error("沒有任何 feature-seed JSON 檔可匯入。")
    return false
  }

  const drafts = []
  const failures = []
  for (const file of files) {
    try {
      const raw = await readFile(file, "utf-8")
      const json = JSON.parse(raw)
      const validation = validateSeedShape(json)
      if (!validation.valid) {
        failures.push({ file, reason: validation.reason })
        continue
      }
      drafts.push({ sourcePath: relative(cwd, file), draft: json })
    } catch (err) {
      failures.push({ file, reason: err.message })
    }
  }

  for (const f of failures) {
    console.warn(`  ! 跳過 ${relative(cwd, f.file)}：${f.reason}`)
  }

  if (drafts.length === 0) {
    console.error("沒有任何有效的 feature-seed JSON 可匯入。")
    return false
  }

  await stageImport({ baseDir: cwd, drafts })
  console.log(`\n  ✓ 已 stage ${drafts.length} 份 draft，啟動 wizard 後將自動匯入。`)
  for (const d of drafts) {
    console.log(`    · ${d.sourcePath}`)
  }
  console.log("")
  return true
}
```

- [ ] **Step 2: 手動 smoke test — 用既有的 reference seeds**

```bash
node bin/cli.js import docs/methodology/artifacts/seeds/FT-002-billing-engine.feature-seed.json
```

Expected:
- 印出 `✓ 已 stage 1 份 draft`
- 接著 spawn `npm run dev`，伺服器啟動（請按 Ctrl+C 結束）
- `.vector/import/pending.json` 存在且 `drafts` 長度為 1

驗證：

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('.vector/import/pending.json','utf-8')).drafts.length)"
```

Expected: `1`

- [ ] **Step 3: 手動 smoke test — 整個資料夾**

```bash
rm -f .vector/import/pending.json
node bin/cli.js import docs/methodology/artifacts/seeds/
```

當伺服器開始啟動時 Ctrl+C 終止。Expected:
- 印出 `✓ 已 stage 4 份 draft`（reference seeds 目錄目前 4 份）

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('.vector/import/pending.json','utf-8')).drafts.length)"
```

Expected: `4`

- [ ] **Step 4: 清理 + Commit**

```bash
rm -rf .vector
git add bin/cli.js
git commit -m "feat: [cli-import] vector-wizard CLI 新增 import 子命令 (#6)"
```

---

### Task 7: stagedImportStore — server-side consume helper

**Files:**
- Create: `src/features/spec-wizard/services/stagedImportStore.ts`
- Test: `src/features/spec-wizard/__tests__/stagedImportStore.test.ts`

- [ ] **Step 1: 寫失敗測試**

```ts
// src/features/spec-wizard/__tests__/stagedImportStore.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, mkdir, writeFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { STAGED_IMPORT_RELATIVE, consumeStagedDrafts } from "../services/stagedImportStore"

describe("consumeStagedDrafts", () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "vector-staged-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("uses the same relative path as the CLI module", () => {
    expect(STAGED_IMPORT_RELATIVE).toBe(".vector/import/pending.json")
  })

  it("returns empty drafts when pending.json does not exist", async () => {
    const result = await consumeStagedDrafts(dir)
    expect(result).toEqual({ drafts: [] })
  })

  it("returns drafts and deletes the file when pending.json exists", async () => {
    const target = join(dir, STAGED_IMPORT_RELATIVE)
    await mkdir(join(dir, ".vector", "import"), { recursive: true })
    await writeFile(
      target,
      JSON.stringify({
        stagedAt: "2026-04-29T00:00:00.000Z",
        drafts: [{ sourcePath: "a", draft: { metadata: { title: "T" } } }]
      })
    )

    const result = await consumeStagedDrafts(dir)

    expect(result.drafts).toEqual([{ sourcePath: "a", draft: { metadata: { title: "T" } } }])
    const remaining = await readdir(join(dir, ".vector", "import"))
    expect(remaining).toEqual([])
  })

  it("returns empty drafts when pending.json is malformed and removes the corrupt file", async () => {
    const target = join(dir, STAGED_IMPORT_RELATIVE)
    await mkdir(join(dir, ".vector", "import"), { recursive: true })
    await writeFile(target, "not json")

    const result = await consumeStagedDrafts(dir)

    expect(result).toEqual({ drafts: [] })
    const remaining = await readdir(join(dir, ".vector", "import"))
    expect(remaining).toEqual([])
  })
})
```

- [ ] **Step 2: 跑測試確認 fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/stagedImportStore.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: 實作**

```ts
// src/features/spec-wizard/services/stagedImportStore.ts
import { readFile, unlink } from "node:fs/promises"
import { join } from "node:path"

// 與 bin/lib/stageImport.mjs 共用的契約。修改路徑時請同步更新。
export const STAGED_IMPORT_RELATIVE = ".vector/import/pending.json"

export type StagedDraftEntry = {
  sourcePath: string
  draft: unknown
}

export type ConsumeResult = {
  drafts: StagedDraftEntry[]
}

export async function consumeStagedDrafts(baseDir: string): Promise<ConsumeResult> {
  const target = join(baseDir, STAGED_IMPORT_RELATIVE)
  let raw: string
  try {
    raw = await readFile(target, "utf-8")
  } catch {
    return { drafts: [] }
  }

  let drafts: StagedDraftEntry[] = []
  try {
    const parsed = JSON.parse(raw) as { drafts?: unknown }
    if (Array.isArray(parsed?.drafts)) {
      drafts = parsed.drafts.filter(
        (entry): entry is StagedDraftEntry =>
          entry != null &&
          typeof entry === "object" &&
          typeof (entry as StagedDraftEntry).sourcePath === "string" &&
          (entry as StagedDraftEntry).draft != null
      )
    }
  } catch {
    drafts = []
  }

  try {
    await unlink(target)
  } catch {
    // file already gone; safe to ignore
  }

  return { drafts }
}
```

- [ ] **Step 4: 跑測試確認 pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/stagedImportStore.test.ts`

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/services/stagedImportStore.ts src/features/spec-wizard/__tests__/stagedImportStore.test.ts
git commit -m "feat: [cli-import] consumeStagedDrafts server-side 讀取/刪除 pending.json (#6)"
```

---

### Task 8: API route — POST /api/import-staged

**Files:**
- Create: `app/api/import-staged/route.ts`
- Test: `src/features/spec-wizard/__tests__/importStagedRoute.test.ts`

- [ ] **Step 1: 對齊既有 route test 的 import 寫法**

先 `cat src/features/spec-wizard/__tests__/generateSpecRoute.test.ts | head -10` 確認既有測試是用 alias (`@/...`) 還是 relative path。新測試 import `POST` 用同樣寫法。

- [ ] **Step 2: 寫失敗測試**

```ts
// src/features/spec-wizard/__tests__/importStagedRoute.test.ts
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../services/stagedImportStore", () => ({
  consumeStagedDrafts: vi.fn()
}))

import { consumeStagedDrafts } from "../services/stagedImportStore"
// 注意：以下 import path 需與 generateSpecRoute.test.ts 對齊
import { POST } from "../../../../app/api/import-staged/route"

const mocked = consumeStagedDrafts as unknown as ReturnType<typeof vi.fn>

afterEach(() => {
  mocked.mockReset()
})

describe("POST /api/import-staged", () => {
  it("returns drafts from consumeStagedDrafts", async () => {
    mocked.mockResolvedValueOnce({
      drafts: [{ sourcePath: "a.json", draft: { metadata: { title: "A" } } }]
    })

    const req = new Request("http://localhost/api/import-staged", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      drafts: [{ sourcePath: "a.json", draft: { metadata: { title: "A" } } }]
    })
    expect(mocked).toHaveBeenCalledWith(process.cwd())
  })

  it("returns empty drafts when nothing is staged", async () => {
    mocked.mockResolvedValueOnce({ drafts: [] })

    const req = new Request("http://localhost/api/import-staged", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ drafts: [] })
  })

  it("returns 500 when consume helper throws", async () => {
    mocked.mockRejectedValueOnce(new Error("boom"))

    const req = new Request("http://localhost/api/import-staged", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Failed to read staged drafts" })
  })
})
```

> 若 `generateSpecRoute.test.ts` 是用 alias `@/../app/api/...`，則此處改用相同寫法；mock 路徑也要跟著改成 `@/features/spec-wizard/services/stagedImportStore`。兩處要一致，否則 vi.mock 不會生效。

- [ ] **Step 3: 跑測試確認 fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/importStagedRoute.test.ts`

Expected: FAIL — route module 尚未建立。

- [ ] **Step 4: 實作**

```ts
// app/api/import-staged/route.ts
import { NextResponse } from "next/server"
import { consumeStagedDrafts } from "@/features/spec-wizard/services/stagedImportStore"

export async function POST(_request: Request) {
  try {
    const result = await consumeStagedDrafts(process.cwd())
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to read staged drafts" }, { status: 500 })
  }
}
```

- [ ] **Step 5: 跑測試確認 pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/importStagedRoute.test.ts`

Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add app/api/import-staged/route.ts src/features/spec-wizard/__tests__/importStagedRoute.test.ts
git commit -m "feat: [cli-import] POST /api/import-staged consume-on-read 端點 (#6)"
```

---

### Task 9: i18n keys — stagedImport.*

**Files:**
- Modify: `src/features/spec-wizard/i18n/messageKeys.ts`
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`

加入 5 條 keys：`stagedImport.success`、`stagedImport.successPlural`、`stagedImport.error`、`stagedImport.partial`、`stagedImport.dismiss`。

- [ ] **Step 1: 在 `messageKeys.ts` 末端新增 5 個 union members**

找到 `MessageKey` union 的最後一個成員，在分號之前接上：

```ts
  | "stagedImport.success"
  | "stagedImport.successPlural"
  | "stagedImport.error"
  | "stagedImport.partial"
  | "stagedImport.dismiss"
```

- [ ] **Step 2: 在 `dictionaries.ts` 兩個語系都補上對應字串**

`zh-TW` 區塊（在 `draftManager.pasteSubmit` 附近接著加）：

```ts
    "stagedImport.success": "已從 CLI 匯入 1 份 draft",
    "stagedImport.successPlural": "已從 CLI 匯入 {count} 份 draft",
    "stagedImport.error": "CLI 匯入失敗：{reason}",
    "stagedImport.partial": "已匯入 {imported} 份，{skipped} 份失敗",
    "stagedImport.dismiss": "關閉",
```

`en` 區塊：

```ts
    "stagedImport.success": "Imported 1 draft from CLI",
    "stagedImport.successPlural": "Imported {count} drafts from CLI",
    "stagedImport.error": "CLI import failed: {reason}",
    "stagedImport.partial": "Imported {imported}, {skipped} failed",
    "stagedImport.dismiss": "Dismiss",
```

- [ ] **Step 3: 跑 typecheck 確認 union 與 dict 都對齊**

Run: `bunx tsc --noEmit`

Expected: 0 errors。若 union 與 dictionary 不齊全會直接報錯，逐一補齊即可。

- [ ] **Step 4: Commit**

```bash
git add src/features/spec-wizard/i18n/messageKeys.ts src/features/spec-wizard/i18n/dictionaries.ts
git commit -m "feat: [cli-import] 新增 stagedImport.* i18n 字串 (#6)"
```

---

### Task 10: useStagedImport hook

**Files:**
- Create: `src/features/spec-wizard/hooks/useStagedImport.ts`
- Test: `src/features/spec-wizard/__tests__/useStagedImport.test.tsx`

Hook 行為：
- mount 時 POST `/api/import-staged`。
- 若 `drafts` 為空：state 維持 `idle`（不顯示 toast）。
- 對每份 `entry.draft`，呼叫 `JSON.stringify(entry.draft)` 餵給 `importDraftJson()`；用 try/catch 包，失敗者計入 `skipped`。
- 結束後 state 變為 `success`（含 `imported` 數）或 `partial`（含 `imported`、`skipped`）或 `error`（fetch 失敗時）。
- 提供 `dismiss()` 把 state 切回 `idle`。
- 確保只執行一次（用 `useRef` flag），避免 React 18/19 strict-mode 雙呼叫造成重複匯入。

- [ ] **Step 1: 寫失敗測試**

```tsx
// src/features/spec-wizard/__tests__/useStagedImport.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useStagedImport } from "../hooks/useStagedImport"
import { __resetForTests } from "../persistence/draftStore"
import { useDraftStore } from "../hooks/useDraftStore"

beforeEach(() => {
  __resetForTests()
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetchOnce(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  const response = new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" }
  })
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response)
}

const validDraft = {
  metadata: { title: "FT-001", locale: "zh-TW" },
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
  agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
}

describe("useStagedImport", () => {
  it("stays idle when staging returns no drafts", async () => {
    mockFetchOnce({ drafts: [] })
    const { result } = renderHook(() => useStagedImport())
    await waitFor(() => expect(result.current.status).toBe("idle"))
    expect(result.current.imported).toBe(0)
  })

  it("imports each staged draft and reports success", async () => {
    mockFetchOnce({
      drafts: [
        { sourcePath: "a.json", draft: validDraft },
        { sourcePath: "b.json", draft: validDraft }
      ]
    })

    const { result: store } = renderHook(() => useDraftStore())
    const { result } = renderHook(() => useStagedImport())

    await waitFor(() => expect(result.current.status).toBe("success"))
    expect(result.current.imported).toBe(2)
    expect(result.current.skipped).toBe(0)
    expect(store.current.drafts.length).toBe(2)
  })

  it("reports partial when some drafts fail", async () => {
    mockFetchOnce({
      drafts: [
        { sourcePath: "good.json", draft: validDraft },
        { sourcePath: "bad.json", draft: { not: "a draft" } }
      ]
    })

    const { result } = renderHook(() => useStagedImport())

    await waitFor(() => expect(result.current.status).toBe("partial"))
    expect(result.current.imported).toBe(1)
    expect(result.current.skipped).toBe(1)
  })

  it("reports error when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"))
    const { result } = renderHook(() => useStagedImport())
    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.error).toBe("offline")
  })

  it("only POSTs once even when re-rendered", async () => {
    mockFetchOnce({ drafts: [] })
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const { rerender } = renderHook(() => useStagedImport())
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    rerender()
    rerender()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("dismiss() resets to idle", async () => {
    mockFetchOnce({ drafts: [{ sourcePath: "a.json", draft: validDraft }] })
    const { result } = renderHook(() => useStagedImport())
    await waitFor(() => expect(result.current.status).toBe("success"))
    act(() => result.current.dismiss())
    expect(result.current.status).toBe("idle")
  })
})
```

- [ ] **Step 2: 跑測試確認 fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/useStagedImport.test.tsx`

Expected: FAIL — module not found.

- [ ] **Step 3: 實作**

```ts
// src/features/spec-wizard/hooks/useStagedImport.ts
"use client"

import { useEffect, useRef, useState } from "react"
import { importDraftJson } from "../persistence/draftStore"

export type StagedImportStatus = "idle" | "running" | "success" | "partial" | "error"

export type UseStagedImportValue = {
  status: StagedImportStatus
  imported: number
  skipped: number
  error: string | null
  dismiss: () => void
}

type StagedDraftEntry = {
  sourcePath: string
  draft: unknown
}

export function useStagedImport(): UseStagedImportValue {
  const [status, setStatus] = useState<StagedImportStatus>("idle")
  const [imported, setImported] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false

    async function run() {
      setStatus("running")
      try {
        const res = await fetch("/api/import-staged", { method: "POST" })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = (await res.json()) as { drafts?: StagedDraftEntry[] }
        const drafts = Array.isArray(data?.drafts) ? data.drafts : []

        if (cancelled) return

        if (drafts.length === 0) {
          setStatus("idle")
          return
        }

        let ok = 0
        let bad = 0
        for (const entry of drafts) {
          try {
            importDraftJson(JSON.stringify(entry.draft))
            ok += 1
          } catch {
            bad += 1
          }
        }

        if (cancelled) return
        setImported(ok)
        setSkipped(bad)
        setStatus(bad === 0 ? "success" : "partial")
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStatus("error")
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  function dismiss() {
    setStatus("idle")
    setImported(0)
    setSkipped(0)
    setError(null)
  }

  return { status, imported, skipped, error, dismiss }
}
```

- [ ] **Step 4: 跑測試確認 pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/useStagedImport.test.tsx`

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/hooks/useStagedImport.ts src/features/spec-wizard/__tests__/useStagedImport.test.tsx
git commit -m "feat: [cli-import] useStagedImport hook 在 wizard mount 時自動匯入 (#6)"
```

---

### Task 11: StagedImportToast component + AppShell 接線

**Files:**
- Create: `src/features/spec-wizard/components/StagedImportToast.tsx`
- Modify: `src/features/spec-wizard/components/AppShell.tsx`

- [ ] **Step 1: 實作 toast component**

```tsx
// src/features/spec-wizard/components/StagedImportToast.tsx
"use client"

import { useStagedImport } from "../hooks/useStagedImport"
import { useI18n } from "../i18n/I18nContext"

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""))
}

export function StagedImportToast() {
  const { t } = useI18n()
  const { status, imported, skipped, error, dismiss } = useStagedImport()

  if (status === "idle" || status === "running") return null

  let message: string
  let role: "status" | "alert" = "status"
  if (status === "success") {
    message = imported === 1 ? t("stagedImport.success") : format(t("stagedImport.successPlural"), { count: imported })
  } else if (status === "partial") {
    message = format(t("stagedImport.partial"), { imported, skipped })
    role = "alert"
  } else {
    message = format(t("stagedImport.error"), { reason: error ?? "unknown" })
    role = "alert"
  }

  return (
    <div
      role={role}
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        background: status === "error" ? "#fee2e2" : "#dcfce7",
        color: "#0f172a",
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        display: "flex",
        gap: "0.75rem",
        alignItems: "center"
      }}
    >
      <span>{message}</span>
      <button type="button" onClick={dismiss} aria-label={t("stagedImport.dismiss")}>
        {t("stagedImport.dismiss")}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 在 AppShell 掛 toast**

修改 `src/features/spec-wizard/components/AppShell.tsx`：

頂部 import 加入：

```ts
import { StagedImportToast } from "./StagedImportToast"
```

在 JSX 既有的 `<AutosaveErrorToast />` 旁邊加一行（同層級）：

```tsx
        <StagedImportToast />
```

- [ ] **Step 3: 跑既有測試確認沒打到別的地方**

Run: `bun run test`

Expected: 全部 PASS。

- [ ] **Step 4: 手動 smoke test（端對端）**

```bash
rm -rf .vector
node bin/cli.js import docs/methodology/artifacts/seeds/FT-002-billing-engine.feature-seed.json
```

CLI 會 spawn `npm run dev`。打開瀏覽器到 `http://localhost:3000` 應看到 toast「已從 CLI 匯入 1 份 draft」，且 Draft Manager 內已多一份 draft。確認後 Ctrl+C 結束伺服器。

> 若手動驗證不便執行，至少確認 `bun run test` 全綠。手動驗證可由使用者本機操作。

- [ ] **Step 5: Commit**

```bash
rm -rf .vector
git add src/features/spec-wizard/components/StagedImportToast.tsx src/features/spec-wizard/components/AppShell.tsx
git commit -m "feat: [cli-import] StagedImportToast 在 wizard mount 後顯示匯入結果 (#6)"
```

---

### Task 12: 更新 Pipeline B 文件與 README

**Files:**
- Modify: `docs/methodology/pipeline-b.md`
- Modify: `README.md`
- Modify: `README.zh-TW.md`

- [ ] **Step 1: 改 Pipeline B「進入下一步：Vector wizard」段**

把現有「Pipeline B 跑完之後...」段落底下的編號清單替換為：

```markdown
1. 在專案目錄執行 `npx vector-wizard import <資料夾或檔案路徑>` 一次性 stage 所有 seed，例如 `npx vector-wizard import ./docs/methodology/artifacts/seeds/`。CLI 會把通過驗證的 seed 寫入 `.vector/import/pending.json`，再啟動本地 wizard。
2. 開啟瀏覽器到 wizard 預設網址（通常為 `http://localhost:3000`）。首次載入時，`StagedImportToast` 會顯示成功匯入的份數，每份 seed 對應 Draft Manager 內的一份 `FeatureDraft`。若你只想單獨匯入一份，仍可如過往使用 Draft Manager 的「貼上 JSON」或檔案選擇。
3. 在 wizard 內補完 acceptance criteria、examples，並逐一確認 `openQuestions` 與假設。
4. 確認 BasicStep 的「Roadmap」區塊：若這份 draft 由 Pipeline B 產生，`id`、`priority`、`dependsOn` 應已預填；可視需要調整 `horizon`，或補上 Slice 階段未決定的欄位。
5. 透過 wizard 的 Generate Spec 匯出最終 YAML，交給後續 AI coding agent。
```

- [ ] **Step 2: README 補一段 CLI usage**

在 `README.md` 既有 `npx vector-wizard` 段落後接：

````markdown
### Importing Pipeline B feature-seeds

After running the methodology Pipeline B, you can stage all generated seeds in one shot:

```bash
npx vector-wizard import ./docs/methodology/artifacts/seeds/
# or one or many specific files
npx vector-wizard import ./seed-a.feature-seed.json ./seed-b.feature-seed.json
```

The CLI writes the resolved drafts into `.vector/import/pending.json` and then launches the wizard. On first load, the wizard auto-imports each draft into its Draft Manager and shows a toast summarising the result. The pending file is consumed atomically (read-and-deleted), so refreshing the wizard never causes duplicate imports.
````

對 `README.zh-TW.md` 寫對應的繁中版本。

- [ ] **Step 3: 確認 lint 仍綠**

Run: `bun run lint`

Expected: 0 errors。

- [ ] **Step 4: Commit**

```bash
git add docs/methodology/pipeline-b.md README.md README.zh-TW.md
git commit -m "docs: [cli-import] 更新 Pipeline B 與 README，加入 vector-wizard import 用法 (#6)"
```

---

### Task 13: 更新 gap-analysis spec 把 #6 標為已實作

**Files:**
- Modify: `docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md`

- [ ] **Step 1: 替換 #6 段落標題**

把第 173 行：

```markdown
## 6. Pipeline B → Wizard 的銜接摩擦過高
```

改成：

```markdown
## 6. Pipeline B → Wizard 的銜接摩擦過高 ✅ 已實作 (2026-04-29)
```

- [ ] **Step 2: 在 #6 段落內加入「### 實作說明」區塊**

在 `## 6. ...` 之後、`### 現況` 之前插入：

```markdown
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
```

- [ ] **Step 3: 更新第 10 節 next-step 表格**

把 #6 那一列「狀態」欄從 `⬜ 未開始` 改為 `✅ 已實作 (2026-04-29)`。

- [ ] **Step 4: 更新表格底下的描述句**

將「下一個建議啟動的項目為 **#6 CLI import 子命令**（解決 Pipeline B 銜接最後一哩）」改為：

```
下一個建議啟動的項目為 **#5 YAML round-trip**（讓 wizard 能反向吃回上一輪 YAML，閉合 inspect-adapt 迴圈）。
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-28-agile-system-gap-analysis.md
git commit -m "docs: [gap-analysis] 標記 #6 CLI import 為已實作 (2026-04-29)"
```

---

### Task 14: 全測試 + lint + 收尾

**Files:**
- 無新增檔案

- [ ] **Step 1: 跑全測試**

Run: `bun run test`

Expected: 所有測試 PASS。

- [ ] **Step 2: 跑 typecheck**

Run: `bun run typecheck`

Expected: 0 errors。

- [ ] **Step 3: 跑 lint**

Run: `bun run lint`

Expected: 0 errors / 0 warnings (or only pre-existing acceptable ones)。

- [ ] **Step 4: 跑 methodology schema 驗證**

Run: `bun run methodology:validate`

Expected: PASS — 既有 reference seeds 不應因本次改動失效。

- [ ] **Step 5: 確認 git status 乾淨**

Run: `git status`

Expected: `nothing to commit, working tree clean`。若有 smoke test 殘留檔（例如 `.vector/`）→ `rm -rf .vector` 後再確認。

- [ ] **Step 6: 完成**

不需要額外 commit。整段工作已分散在前面 12+ 個 commit 中。

---

## Self-Review

**1. Spec coverage（gap-analysis #6）**

| 需求 | 對應 task |
|------|-----------|
| `npx vector-wizard import <path-or-glob>` 子命令 | Task 6 |
| 支援檔案 + 資料夾批次 | Task 4 + Task 6 |
| 匯入時自動進入 wizard 並產生 drafts | Task 8 + Task 10 + Task 11 |
| 不破壞既有 paste / file picker 流程 | Task 11（toast 與 DraftManagerModal 並存，未替換） |
| 文件同步（Pipeline B「貼進 Draft Manager」描述） | Task 12 |
| 標記 #6 ✅ | Task 13 |

**2. 設計約束 vs. 既有 Invariants**

- ✅ YAML 不變、`schemaVersion` 不變（純加 CLI 入口，不動 schema）。
- ✅ AI 非權威：CLI 不做語意改動，原樣寫進 staging。
- ✅ 單人本地工具：`.vector/` 已 gitignore，使用 cwd 作 baseDir。
- ✅ Validation 仍刻意鬆：CLI 端只檢查最低 shape，正式驗證仍由 wizard 端 `normalizeDraft` + `validation.ts` 處理。
- ✅ Drafts 仍可正常 export/import JSON、貼上 JSON。

**3. 型別與識別子一致**

- `STAGED_IMPORT_RELATIVE` 在 `bin/lib/stageImport.mjs` 與 `src/features/spec-wizard/services/stagedImportStore.ts` 兩處字面值相同（`.vector/import/pending.json`），且兩邊都有註解互相指認。
- `StagedDraftEntry` shape (`{ sourcePath, draft }`) 在 server 端 type 與 hook 端 inline type 一致。
- `useStagedImport` 的 status 型別 `"idle" | "running" | "success" | "partial" | "error"` 在 hook、toast、測試三處用同一組字面值。

**4. Placeholder scan**

- 沒有 TODO / TBD / "implement later" / "fill in details"。
- 每個 step 的程式碼都完整可貼。
- Task 8 Step 1 留了「對齊既有 generateSpecRoute.test.ts 的 import 寫法」指示，因為現存檔案的選擇（alias vs relative）需要實作者實地對照——這是「對齊既有 pattern」的提示，不是 placeholder。

**5. 已知限制 / 不在本 plan**

- CLI 不附 watch mode（gap-analysis 也僅將其列為附帶）。
- CLI 不支援 deep schema 驗證（用 ajv 等）；shape 檢查刻意輕量。
- DraftManagerModal 自動開啟（gap-analysis 提到「自動進入 wizard 並打開 Draft Manager」）暫不在本 plan：toast 已足夠告知匯入結果，且 DraftSwitcher 顯示已新增的 drafts。需求若強制必須開 modal，可在後續迭代加 `?openManager=1` query 接線——本 plan 故意不做以保持最小變更。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-29-cli-import.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 我每個 task 派一個新的 subagent，每完成一個 task review 一次後再進下一個。
2. **Inline Execution** — 在當前 session 內逐 task 執行，配合 checkpoint review。

Which approach?
