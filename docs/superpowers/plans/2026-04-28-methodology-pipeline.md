# Methodology Pipeline (Path B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a documentation-first methodology library under `docs/methodology/` that walks a user from "I want to build system X" through Frame → Decompose → Slice → Handoff and produces `feature-seed.json` files that paste into the Vector wizard's Draft Manager without blocking errors.

**Architecture:** Markdown + JSON only. Four JSON Schemas (`docs/methodology/schemas/`) lock the inter-stage handoff. A vitest suite using `ajv` validates the schemas themselves and every reference-case JSON (file or fenced block) against its declared schema, plus runs the wizard's `validateDraft` against the feature-seed outputs. An agent skill at `.agents/skills/vector-pipeline-b/` mirrors the agent-script layer of each stage.

**Tech Stack:** Markdown (zh-TW for A/B layers, English for C layer), JSON Schema draft-07, `ajv` (new devDependency), Vitest, Node `fs`, the existing `validateDraft` from `src/features/spec-wizard/model/validation.ts`.

---

## Decisions resolved up front (Spec §12)

The spec marks several decisions deferred to planning. They are resolved here so executors do not re-litigate:

1. **`oneLiner` template wording.** Single locale-pair template, embedded in the Stage 1 docs:
   - zh-TW: `這是一個 ___，幫助 ___ 解決 ___。`
   - en: `This is a ___, helping ___ solve ___.`
2. **`agent-script.md` format.** Pure markdown, no YAML frontmatter. Only the agent skill's top-level `SKILL.md` carries frontmatter (matching `vector-analyzer/SKILL.md`).
3. **Skill ↔ docs linkage.** The `.agents/skills/vector-pipeline-b/stage-N-*.md` files are short stubs that link to the canonical `docs/methodology/stages/N-*/agent-script.md` via relative paths. The canonical docs remain source of truth; the skill directory is the agent-facing surface.
4. **Validation entry point.** No bespoke CLI helper. Validation runs through `bun run test` via vitest. A lightweight npm script alias `methodology:validate` is added for ergonomics.
5. **npm artifact.** Out of MVP. The skill stays repo-local.
6. **Embedded JSON convention.** Reference-case markdown declares which schema a fenced block belongs to with an HTML comment immediately preceding the fence:

   ````markdown
   <!-- schema: capability-list -->
   ```json
   { ... }
   ```
   ````

   Recognized schema slugs: `system-brief`, `capability-list`, `feature-candidates`, `feature-seed`.

## File Structure

Files created or modified, grouped by purpose:

**Top-level docs**
- Create `docs/methodology/README.md`
- Create `docs/methodology/pipeline-b.md`
- Create `docs/methodology/glossary.md`

**Schemas (one file per output)**
- Create `docs/methodology/schemas/system-brief.schema.json`
- Create `docs/methodology/schemas/capability-list.schema.json`
- Create `docs/methodology/schemas/feature-candidates.schema.json`
- Create `docs/methodology/schemas/feature-seed.schema.json`

**Stage docs (4 stages × 3 reader layers)**
- Create `docs/methodology/stages/1-frame/{methodology,guide,agent-script}.md`
- Create `docs/methodology/stages/2-decompose/{methodology,guide,agent-script}.md`
- Create `docs/methodology/stages/3-slice/{methodology,guide,agent-script}.md`
- Create `docs/methodology/stages/4-handoff/{methodology,guide,agent-script}.md`

**Reference case (Internal Reporting Platform)**
- Create `docs/methodology/reference-case/README.md`
- Create `docs/methodology/reference-case/01-frame.md` (embeds `system-brief` JSON)
- Create `docs/methodology/reference-case/02-decompose.md` (embeds `capability-list` JSON)
- Create `docs/methodology/reference-case/03-slice.md` (embeds `feature-candidates` JSON)
- Create `docs/methodology/reference-case/04-handoff/README.md`
- Create `docs/methodology/reference-case/04-handoff/FT-001-sso-signin.feature-seed.json`
- Create `docs/methodology/reference-case/04-handoff/FT-002-kpi-catalog.feature-seed.json`

**Agent skill**
- Create `.agents/skills/vector-pipeline-b/SKILL.md`
- Create `.agents/skills/vector-pipeline-b/stage-1-frame.md`
- Create `.agents/skills/vector-pipeline-b/stage-2-decompose.md`
- Create `.agents/skills/vector-pipeline-b/stage-3-slice.md`
- Create `.agents/skills/vector-pipeline-b/stage-4-handoff.md`

**Tests + helpers**
- Create `tests/methodology/extractEmbeddedJson.ts`
- Create `tests/methodology/extractEmbeddedJson.test.ts`
- Create `tests/methodology/schemas.test.ts`

**Tooling**
- Modify `package.json` (add `ajv` devDependency, add `methodology:validate` script)

---

## Task 1: Scaffold directories and top-level skeletons

**Files:**
- Create `docs/methodology/README.md`
- Create `docs/methodology/pipeline-b.md`

- [ ] **Step 1: Create the methodology directory tree**

```bash
mkdir -p docs/methodology/schemas \
         docs/methodology/stages/1-frame \
         docs/methodology/stages/2-decompose \
         docs/methodology/stages/3-slice \
         docs/methodology/stages/4-handoff \
         docs/methodology/reference-case/04-handoff
```

- [ ] **Step 2: Write `docs/methodology/README.md`**

Required sections (in order, zh-TW prose):

1. `# 方法論手冊（Methodology Handbook）` — one-paragraph statement of purpose: 方法論手冊銜接「我想做某個系統」到 Vector wizard 可消化的 N 個 feature-seed，是文件 + JSON Schema，不含程式邏輯。
2. `## 三條入路（Path A / B / C）` — bullet list:
   - Path A — 願景／商業出發。`狀態：MVP 範圍外，延後規劃。`
   - Path B — 系統概念出發。`狀態：本次 MVP 唯一實作路徑，請見 pipeline-b.md。`
   - Path C — 問題／痛點出發。`狀態：MVP 範圍外，延後規劃。`
3. `## Pipeline 結構` — describe the four-stage flow with the same ASCII diagram from spec §3 (system idea → Frame → Decompose → Slice → Handoff → Vector wizard).
4. `## 三層讀者`：表格列出 Layer A/B/C，audience，檔名規則 (`methodology.md` / `guide.md` / `agent-script.md`)。
5. `## 語言政策` — A/B layers use zh-TW, C layer uses English; JSON keys always English; reference glossary.md。
6. `## 目錄索引` — bullet list of every top-level file path under `docs/methodology/`，每個檔案後接一句說明。
7. `## 與 Vector wizard 的關係` — one paragraph: handoff via copy-paste JSON; feature-seed schemaVersion tracks wizard schemaVersion `"0.1"`.

- [ ] **Step 3: Write `docs/methodology/pipeline-b.md`**

Required sections (zh-TW):

1. `# Pipeline B：從系統概念到 feature-seed` — opening paragraph anchoring scope (system → Vector).
2. `## 何時走 Path B` — bullet criteria (有了系統雛形概念 / 不確定要切哪些 feature / 想用 AI 協助但保留人類判斷)。
3. `## 四個階段一覽` — table with columns `階段 | 目標 | 主要產出 | 對應 Vector 欄位`. Rows mirror spec §4.
4. `## 階段間如何銜接` — paragraph describing how `successSignals`, `constraints`, `risks`, `openQuestions` propagate from `system-brief` → `feature-seed`.
5. `## 跑完整段大概多久` — give pragmatic ranges (Frame 1–2 hr, Decompose 2–4 hr, Slice 2–3 hr, Handoff 30 min – 1 hr, single-developer baseline)。
6. `## 失敗與重來` — bullet list of when to loop back (e.g., riskiestAssumption changes during Decompose → revise Frame)。
7. `## 進入下一步：Vector wizard` — link to `npx vector-wizard` command and `AGENTS.md`.

These two files are skeletons in the sense that the executor writes prose to fit the section briefs above; sections themselves are non-negotiable.

- [ ] **Step 4: Verify build still passes**

Run: `bun run build`
Expected: build succeeds (no Next.js page added; markdown files do not affect the build).

- [ ] **Step 5: Commit**

```bash
git add docs/methodology/README.md docs/methodology/pipeline-b.md
git commit -m "docs: [methodology] scaffold methodology handbook with Path B overview"
```

---

## Task 2: Add ajv and create the schema test harness

**Files:**
- Modify `package.json`
- Create `tests/methodology/schemas.test.ts`

- [ ] **Step 1: Install ajv as a devDependency**

Run:
```bash
bun add -d ajv@^8
```
Expected: `ajv` appears under `devDependencies` in `package.json` and `bun.lock` updates.

- [ ] **Step 2: Add `methodology:validate` script to `package.json`**

Edit the `scripts` block to add:

```json
"methodology:validate": "vitest run tests/methodology"
```

So the full `scripts` section becomes:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "methodology:validate": "vitest run tests/methodology"
}
```

- [ ] **Step 3: Write the failing harness test**

Create `tests/methodology/schemas.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import Ajv from "ajv"
import { describe, expect, it } from "vitest"

const SCHEMAS_DIR = resolve(__dirname, "../../docs/methodology/schemas")

function loadSchema(filename: string): object {
  const path = resolve(SCHEMAS_DIR, filename)
  return JSON.parse(readFileSync(path, "utf8"))
}

function newAjv(): Ajv {
  return new Ajv({ allErrors: true, strict: false })
}

describe("methodology schemas — harness", () => {
  it("schemas directory exists and is reachable", () => {
    expect(() => readdirSync(SCHEMAS_DIR)).not.toThrow()
  })

  it("ajv can be instantiated", () => {
    const ajv = newAjv()
    expect(ajv).toBeDefined()
  })
})

export { loadSchema, newAjv, SCHEMAS_DIR }
```

- [ ] **Step 4: Run the harness test**

Run: `bun run methodology:validate`
Expected: PASS — `schemas directory exists and is reachable` (the `mkdir -p` in Task 1 created it) and `ajv can be instantiated`.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock tests/methodology/schemas.test.ts
git commit -m "test: [methodology] add ajv and schema validation harness"
```

---

## Task 3: `system-brief.schema.json` (TDD)

**Files:**
- Create `docs/methodology/schemas/system-brief.schema.json`
- Modify `tests/methodology/schemas.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/methodology/schemas.test.ts` (below the existing harness `describe`):

```ts
describe("system-brief schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    oneLiner: "This is a reporting platform, helping ops teams solve manual spreadsheet pain.",
    problem: ["Reports take 4 hours/week"],
    nonProblems: ["External customer dashboards"],
    targetUsers: [{ role: "Ops Analyst", context: "Weekly KPI review" }],
    successSignals: ["Reduce report generation from 4 hours to 30 minutes"],
    uniqueValue: "Single source of truth pulled from production databases.",
    keyMetrics: [{ name: "Weekly report time", target: "< 30 min" }],
    constraints: ["Use existing Snowflake warehouse"],
    riskiestAssumptions: ["Query layer scales"],
    openQuestions: ["Who owns dashboards?"]
  }

  it("validates a complete fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    const validate = ajv.compile(schema)
    expect(validate(goodFixture)).toBe(true)
  })

  it("rejects a fixture missing required oneLiner", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    const validate = ajv.compile(schema)
    const bad = { ...goodFixture, oneLiner: undefined }
    expect(validate(bad)).toBe(false)
  })

  it("rejects a fixture with wrong schemaVersion", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    const validate = ajv.compile(schema)
    const bad = { ...goodFixture, schemaVersion: "0.0" }
    expect(validate(bad)).toBe(false)
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run methodology:validate`
Expected: FAIL with `ENOENT: no such file or directory, open '.../system-brief.schema.json'`.

- [ ] **Step 3: Create the schema file**

Create `docs/methodology/schemas/system-brief.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://vector.cmg.local/methodology/system-brief.schema.json",
  "title": "SystemBrief",
  "description": "Stage 1 (Frame) output: a written anchor for the system before decomposition.",
  "type": "object",
  "required": [
    "schemaVersion",
    "oneLiner",
    "problem",
    "nonProblems",
    "targetUsers",
    "successSignals",
    "uniqueValue",
    "keyMetrics",
    "constraints",
    "riskiestAssumptions",
    "openQuestions"
  ],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "type": "string", "const": "0.1" },
    "oneLiner": { "type": "string", "minLength": 1 },
    "problem": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
    "nonProblems": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "targetUsers": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["role", "context"],
        "additionalProperties": false,
        "properties": {
          "role": { "type": "string", "minLength": 1 },
          "context": { "type": "string", "minLength": 1 }
        }
      }
    },
    "successSignals": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "uniqueValue": { "type": "string" },
    "keyMetrics": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "target"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "target": { "type": "string", "minLength": 1 }
        }
      }
    },
    "constraints": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "riskiestAssumptions": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "openQuestions": { "type": "array", "items": { "type": "string", "minLength": 1 } }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run methodology:validate`
Expected: PASS — all four `system-brief schema` tests green.

- [ ] **Step 5: Commit**

```bash
git add docs/methodology/schemas/system-brief.schema.json tests/methodology/schemas.test.ts
git commit -m "feat: [methodology] add system-brief schema with validation tests"
```

---

## Task 4: `capability-list.schema.json` (TDD)

**Files:**
- Create `docs/methodology/schemas/capability-list.schema.json`
- Modify `tests/methodology/schemas.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/methodology/schemas.test.ts`:

```ts
describe("capability-list schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    capabilities: [
      {
        id: "CAP-001",
        name: "Authenticated dashboard access",
        description: "Authorized users sign in and view scoped dashboards.",
        actors: ["Ops Analyst"],
        jobs: ["Sign in"],
        events: ["UserAuthenticated"]
      }
    ]
  }

  it("validates a complete fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    expect(ajv.compile(schema)(goodFixture)).toBe(true)
  })

  it("rejects a malformed capability id", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    const bad = {
      ...goodFixture,
      capabilities: [{ ...goodFixture.capabilities[0], id: "cap-1" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects an empty capabilities array", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    const bad = { ...goodFixture, capabilities: [] }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run methodology:validate`
Expected: FAIL — `ENOENT` for `capability-list.schema.json`.

- [ ] **Step 3: Create the schema file**

Create `docs/methodology/schemas/capability-list.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://vector.cmg.local/methodology/capability-list.schema.json",
  "title": "CapabilityList",
  "description": "Stage 2 (Decompose) output: structured capability list derived from roles, jobs, and events.",
  "type": "object",
  "required": ["schemaVersion", "capabilities"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "type": "string", "const": "0.1" },
    "capabilities": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "name", "description", "actors", "jobs", "events"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^CAP-\\d{3}$" },
          "name": { "type": "string", "minLength": 1 },
          "description": { "type": "string", "minLength": 1 },
          "actors": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
          "jobs": { "type": "array", "items": { "type": "string", "minLength": 1 } },
          "events": { "type": "array", "items": { "type": "string", "minLength": 1 } }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run methodology:validate`
Expected: PASS — all `capability-list schema` tests green.

- [ ] **Step 5: Commit**

```bash
git add docs/methodology/schemas/capability-list.schema.json tests/methodology/schemas.test.ts
git commit -m "feat: [methodology] add capability-list schema with validation tests"
```

---

## Task 5: `feature-candidates.schema.json` (TDD)

**Files:**
- Create `docs/methodology/schemas/feature-candidates.schema.json`
- Modify `tests/methodology/schemas.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/methodology/schemas.test.ts`:

```ts
describe("feature-candidates schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    features: [
      {
        id: "FT-001",
        title: "SSO sign-in",
        oneLineGoal: "Internal users sign in via corporate SSO.",
        linkedCapabilities: ["CAP-001"],
        priority: "must",
        estimatedSize: "M",
        dependsOn: [],
        rationale: "Walking skeleton — nothing else can ship without auth."
      }
    ]
  }

  it("validates a complete fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    expect(ajv.compile(schema)(goodFixture)).toBe(true)
  })

  it("rejects an invalid priority", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    const bad = {
      ...goodFixture,
      features: [{ ...goodFixture.features[0], priority: "maybe" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects an invalid estimatedSize", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    const bad = {
      ...goodFixture,
      features: [{ ...goodFixture.features[0], estimatedSize: "huge" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects malformed feature id", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    const bad = {
      ...goodFixture,
      features: [{ ...goodFixture.features[0], id: "feature-1" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run methodology:validate`
Expected: FAIL — `ENOENT` for `feature-candidates.schema.json`.

- [ ] **Step 3: Create the schema file**

Create `docs/methodology/schemas/feature-candidates.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://vector.cmg.local/methodology/feature-candidates.schema.json",
  "title": "FeatureCandidates",
  "description": "Stage 3 (Slice) output: candidate features with priority and dependencies.",
  "type": "object",
  "required": ["schemaVersion", "features"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "type": "string", "const": "0.1" },
    "features": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": [
          "id",
          "title",
          "oneLineGoal",
          "linkedCapabilities",
          "priority",
          "estimatedSize",
          "dependsOn",
          "rationale"
        ],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^FT-\\d{3}$" },
          "title": { "type": "string", "minLength": 1 },
          "oneLineGoal": { "type": "string", "minLength": 1 },
          "linkedCapabilities": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string", "pattern": "^CAP-\\d{3}$" }
          },
          "priority": { "type": "string", "enum": ["must", "should", "could", "wont"] },
          "estimatedSize": { "type": "string", "enum": ["S", "M", "L", "XL"] },
          "dependsOn": {
            "type": "array",
            "items": { "type": "string", "pattern": "^FT-\\d{3}$" }
          },
          "rationale": { "type": "string", "minLength": 1 }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run methodology:validate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/methodology/schemas/feature-candidates.schema.json tests/methodology/schemas.test.ts
git commit -m "feat: [methodology] add feature-candidates schema with validation tests"
```

---

## Task 6: `feature-seed.schema.json` + wizard validation crosscheck (TDD)

**Files:**
- Create `docs/methodology/schemas/feature-seed.schema.json`
- Modify `tests/methodology/schemas.test.ts`

The feature-seed schema mirrors the wizard's `FeatureDraft` (see `src/features/spec-wizard/model/specTypes.ts`) plus a top-level `schemaVersion`. The schema's required fields match the wizard's blocking validation (title, goal.statement, ≥1 story title or userStory) so any seed that passes the schema also passes `validateDraft` without blocking errors. A second test asserts this crosscheck explicitly.

- [ ] **Step 1: Add the failing test**

Append to `tests/methodology/schemas.test.ts`:

```ts
import { validateDraft } from "@/features/spec-wizard/model/validation"
import type { FeatureDraft } from "@/features/spec-wizard/model/specTypes"

describe("feature-seed schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    metadata: { title: "SSO sign-in", owner: "", locale: "zh-TW" },
    summary: { problem: "缺少統一登入。", desiredOutcome: "SSO 一鍵進入儀表板。" },
    goal: {
      statement: "讓內部使用者透過企業 SSO 登入並抵達個人化儀表板。",
      successSignals: ["首次登入時間少於 30 秒"]
    },
    impacts: [{ id: "IM-001", actor: "Ops Analyst", impact: "免於重複登入" }],
    deliverables: [{ id: "DE-001", name: "SSO 登入流程", description: "OIDC/SAML 整合" }],
    userActivities: [{ id: "UA-001", actor: "Ops Analyst", activity: "用企業帳號登入" }],
    epics: [
      {
        id: "EP-001",
        title: "登入與身分",
        stories: [
          {
            id: "US-001",
            title: "SSO 一鍵登入",
            userStory: "身為 Ops Analyst，我希望用 SSO 一鍵登入。",
            acceptanceCriteria: [{ id: "AC-001", statement: "點擊『SSO 登入』後 5 秒內導向首頁。" }],
            examples: [
              {
                id: "EX-001",
                format: "given-when-then",
                given: "已登入企業 IdP",
                when: "點擊 SSO 登入按鈕",
                then: "5 秒內進入個人化儀表板"
              }
            ]
          }
        ]
      }
    ],
    agentBoundaries: {
      nonGoals: ["不支援外部客戶登入"],
      constraints: ["必須使用既有 IdP"],
      testExpectations: ["SSO 重定向回流的單元測試"],
      risks: ["既有查詢層在規模化下效能不足"],
      openQuestions: ["儀表板 schema 由誰負責？"]
    }
  }

  it("validates a complete feature-seed fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    expect(ajv.compile(schema)(goodFixture)).toBe(true)
  })

  it("rejects feature-seed missing metadata.title", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const bad = { ...goodFixture, metadata: { ...goodFixture.metadata, title: "" } }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects feature-seed missing goal.statement", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const bad = { ...goodFixture, goal: { ...goodFixture.goal, statement: "" } }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects feature-seed with no story", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const bad = { ...goodFixture, epics: [] }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("good fixture also passes wizard validateDraft without blocking errors", () => {
    const { schemaVersion: _v, ...draft } = goodFixture
    const result = validateDraft(draft as FeatureDraft)
    expect(result.blockingErrors).toEqual([])
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run methodology:validate`
Expected: FAIL — `ENOENT` for `feature-seed.schema.json`.

- [ ] **Step 3: Create the schema file**

Create `docs/methodology/schemas/feature-seed.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://vector.cmg.local/methodology/feature-seed.schema.json",
  "title": "FeatureSeed",
  "description": "Stage 4 (Handoff) output: a partially filled FeatureDraft compatible with the Vector wizard's Draft Manager.",
  "type": "object",
  "required": [
    "schemaVersion",
    "metadata",
    "summary",
    "goal",
    "impacts",
    "deliverables",
    "userActivities",
    "epics",
    "agentBoundaries"
  ],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "type": "string", "const": "0.1" },
    "metadata": {
      "type": "object",
      "required": ["title", "locale"],
      "additionalProperties": false,
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "owner": { "type": "string" },
        "locale": { "type": "string", "enum": ["zh-TW", "en"] }
      }
    },
    "summary": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "problem": { "type": "string" },
        "desiredOutcome": { "type": "string" }
      }
    },
    "goal": {
      "type": "object",
      "required": ["statement", "successSignals"],
      "additionalProperties": false,
      "properties": {
        "statement": { "type": "string", "minLength": 1 },
        "successSignals": { "type": "array", "items": { "type": "string" } }
      }
    },
    "impacts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "actor", "impact"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^IM-\\d{3}$" },
          "actor": { "type": "string" },
          "impact": { "type": "string" }
        }
      }
    },
    "deliverables": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "description"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^DE-\\d{3}$" },
          "name": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "userActivities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "actor", "activity"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^UA-\\d{3}$" },
          "actor": { "type": "string" },
          "activity": { "type": "string" }
        }
      }
    },
    "epics": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "title", "stories"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "pattern": "^EP-\\d{3}$" },
          "title": { "type": "string" },
          "stories": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["id", "title", "userStory", "acceptanceCriteria", "examples"],
              "additionalProperties": false,
              "properties": {
                "id": { "type": "string", "pattern": "^US-\\d{3}$" },
                "title": { "type": "string", "minLength": 1 },
                "userStory": { "type": "string" },
                "acceptanceCriteria": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["id", "statement"],
                    "additionalProperties": false,
                    "properties": {
                      "id": { "type": "string", "pattern": "^AC-\\d{3}$" },
                      "statement": { "type": "string" }
                    }
                  }
                },
                "examples": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["id", "format"],
                    "additionalProperties": false,
                    "properties": {
                      "id": { "type": "string", "pattern": "^EX-\\d{3}$" },
                      "format": { "type": "string", "enum": ["given-when-then", "natural-language"] },
                      "given": { "type": "string" },
                      "when": { "type": "string" },
                      "then": { "type": "string" },
                      "scenario": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "agentBoundaries": {
      "type": "object",
      "required": ["nonGoals", "constraints", "testExpectations", "risks", "openQuestions"],
      "additionalProperties": false,
      "properties": {
        "nonGoals": { "type": "array", "items": { "type": "string" } },
        "constraints": { "type": "array", "items": { "type": "string" } },
        "testExpectations": { "type": "array", "items": { "type": "string" } },
        "risks": { "type": "array", "items": { "type": "string" } },
        "openQuestions": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run methodology:validate`
Expected: PASS — all `feature-seed schema` tests green, including the wizard `validateDraft` crosscheck.

- [ ] **Step 5: Commit**

```bash
git add docs/methodology/schemas/feature-seed.schema.json tests/methodology/schemas.test.ts
git commit -m "feat: [methodology] add feature-seed schema and crosscheck against wizard validateDraft"
```

---

## Task 7: Embedded JSON extractor (TDD)

The reference-case markdown files (`02-decompose.md`, `03-slice.md`) need to embed JSON inside fenced code blocks while still being machine-validated. This task ships the extractor and reuses it in Task 8's reference-case validation pass.

**Files:**
- Create `tests/methodology/extractEmbeddedJson.ts`
- Create `tests/methodology/extractEmbeddedJson.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/methodology/extractEmbeddedJson.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { extractEmbeddedJson } from "./extractEmbeddedJson"

describe("extractEmbeddedJson", () => {
  it("returns empty array when no markers exist", () => {
    const input = "# Hello\n\n```json\n{}\n```\n"
    expect(extractEmbeddedJson(input)).toEqual([])
  })

  it("extracts a single tagged block", () => {
    const input = [
      "# Stage",
      "",
      "<!-- schema: capability-list -->",
      "```json",
      "{ \"a\": 1 }",
      "```",
      ""
    ].join("\n")
    expect(extractEmbeddedJson(input)).toEqual([
      { schema: "capability-list", json: { a: 1 } }
    ])
  })

  it("extracts multiple tagged blocks of mixed schemas", () => {
    const input = [
      "<!-- schema: system-brief -->",
      "```json",
      "{ \"x\": 1 }",
      "```",
      "between text",
      "<!-- schema: feature-candidates -->",
      "```json",
      "{ \"y\": 2 }",
      "```"
    ].join("\n")
    expect(extractEmbeddedJson(input)).toEqual([
      { schema: "system-brief", json: { x: 1 } },
      { schema: "feature-candidates", json: { y: 2 } }
    ])
  })

  it("throws when a tagged block contains malformed JSON", () => {
    const input = [
      "<!-- schema: system-brief -->",
      "```json",
      "{ not valid",
      "```"
    ].join("\n")
    expect(() => extractEmbeddedJson(input)).toThrow(/JSON/)
  })

  it("ignores untagged json blocks", () => {
    const input = [
      "```json",
      "{ \"untagged\": true }",
      "```",
      "<!-- schema: system-brief -->",
      "```json",
      "{ \"tagged\": true }",
      "```"
    ].join("\n")
    expect(extractEmbeddedJson(input)).toEqual([
      { schema: "system-brief", json: { tagged: true } }
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run methodology:validate`
Expected: FAIL — `Cannot find module './extractEmbeddedJson'`.

- [ ] **Step 3: Implement the extractor**

Create `tests/methodology/extractEmbeddedJson.ts`:

```ts
export type EmbeddedJsonBlock = {
  schema: string
  json: unknown
}

const PATTERN = /<!--\s*schema:\s*([a-z-]+)\s*-->\s*\n```json\s*\n([\s\S]*?)\n```/g

export function extractEmbeddedJson(markdown: string): EmbeddedJsonBlock[] {
  const blocks: EmbeddedJsonBlock[] = []
  let match: RegExpExecArray | null
  while ((match = PATTERN.exec(markdown)) !== null) {
    const [, schema, raw] = match
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to parse JSON for schema='${schema}': ${reason}`)
    }
    blocks.push({ schema, json: parsed })
  }
  return blocks
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run methodology:validate`
Expected: PASS — all 5 extractor tests green.

- [ ] **Step 5: Commit**

```bash
git add tests/methodology/extractEmbeddedJson.ts tests/methodology/extractEmbeddedJson.test.ts
git commit -m "test: [methodology] add embedded-JSON extractor for reference-case docs"
```

---

## Task 8: Stage 1 — Frame (3 layers + reference case 01)

**Files:**
- Create `docs/methodology/stages/1-frame/methodology.md`
- Create `docs/methodology/stages/1-frame/guide.md`
- Create `docs/methodology/stages/1-frame/agent-script.md`
- Create `docs/methodology/reference-case/README.md`
- Create `docs/methodology/reference-case/01-frame.md`
- Modify `tests/methodology/schemas.test.ts` (add reference-case sweep)

The schema is now stable, so this task introduces both the prose for Stage 1 and the **reference-case sweep test** that loops over `docs/methodology/reference-case/**/*.md` and `**/*.feature-seed.json`, extracting embedded JSON and validating each block. The sweep is added in Step 1 so the reference-case file written in Step 6 is checked immediately.

- [ ] **Step 1: Add the reference-case sweep test**

Append to `tests/methodology/schemas.test.ts`:

```ts
import { readdirSync as _readdirSync, statSync } from "node:fs"
import { extractEmbeddedJson } from "./extractEmbeddedJson"

const REFERENCE_DIR = resolve(__dirname, "../../docs/methodology/reference-case")

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of _readdirSync(dir)) {
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) {
      out.push(...walk(path))
    } else {
      out.push(path)
    }
  }
  return out
}

describe("reference-case sweep", () => {
  const ajv = newAjv()
  const compiled = {
    "system-brief": ajv.compile(loadSchema("system-brief.schema.json")),
    "capability-list": ajv.compile(loadSchema("capability-list.schema.json")),
    "feature-candidates": ajv.compile(loadSchema("feature-candidates.schema.json")),
    "feature-seed": ajv.compile(loadSchema("feature-seed.schema.json"))
  } as const
  type SchemaName = keyof typeof compiled

  const files = walk(REFERENCE_DIR)

  for (const file of files.filter((f) => f.endsWith(".md"))) {
    it(`embedded JSON in ${file.replace(REFERENCE_DIR + "/", "")} validates against its declared schema`, () => {
      const md = readFileSync(file, "utf8")
      const blocks = extractEmbeddedJson(md)
      for (const block of blocks) {
        expect(Object.keys(compiled)).toContain(block.schema)
        const validate = compiled[block.schema as SchemaName]
        const ok = validate(block.json)
        if (!ok) {
          throw new Error(
            `${file} → schema=${block.schema} failed:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`
          )
        }
      }
    })
  }

  for (const file of files.filter((f) => f.endsWith(".feature-seed.json"))) {
    it(`feature-seed file ${file.replace(REFERENCE_DIR + "/", "")} validates against feature-seed schema and wizard validateDraft`, () => {
      const json = JSON.parse(readFileSync(file, "utf8"))
      expect(compiled["feature-seed"](json)).toBe(true)
      const { schemaVersion: _v, ...draft } = json
      const result = validateDraft(draft as FeatureDraft)
      expect(result.blockingErrors).toEqual([])
    })
  }
})
```

Run: `bun run methodology:validate`
Expected: PASS — the loop currently has zero `it()` calls (no reference-case files yet) so vitest reports the `describe` with no failures. The sweep activates once Step 6 writes a file.

- [ ] **Step 2: Write `docs/methodology/stages/1-frame/methodology.md` (Layer A, zh-TW)**

Required sections (in order):

1. `# Stage 1：Frame（系統定錨）` — opening paragraph: 為什麼 decompose 之前必須先把系統寫下來？因為若沒有書面定錨，後面所有切割都會在錯誤的目標上累積。
2. `## 方法論組合` — explain the mix: Problem Statement、Lean Canvas（精簡版）、Hypothesis-driven（最危險假設）。對每個來源寫一段 50–100 字介紹與其在本階段的角色。
3. `## 為何選擇這三者` — argue tradeoffs: Lean Canvas 整版過大；Problem Statement 太單薄；Hypothesis-driven 補上「我們害怕什麼是錯的」。
4. `## 十個必填欄位` — table with 三欄：欄位、用途、若略過的代價。逐一列舉 oneLiner / problem / nonProblems / targetUsers / successSignals / uniqueValue / keyMetrics / constraints / riskiestAssumptions / openQuestions。
5. `## 與下游的對應` — explain how successSignals → goal.successSignals、constraints/risks/openQuestions → agentBoundaries.* 自動傳遞。
6. `## 何時不適用` — Frame 不適合每天都會推翻的早期探索；該情境請走 Path C。
7. `## 進入下一階段的條件` — three numbered checks: 十欄填齊、riskiestAssumptions 至少有一條讓你緊張、openQuestions 不是空的。

Voice: 第一人稱複數（「我們」），段落型 prose 與條列並用。每節 100–250 字。

- [ ] **Step 3: Write `docs/methodology/stages/1-frame/guide.md` (Layer B, zh-TW)**

Required sections:

1. `# Frame 操作指南（給非技術角色）` — 一段話告訴讀者：30–90 分鐘可完成。
2. `## 你需要先準備什麼` — 條列：對系統的口頭描述、預期使用者、最近一次討論裡浮現的痛點、可能的限制。
3. `## 一步一步填` — H3 sections per field. 每個 H3 包含：
   - **要填什麼**：一句口語化說明。
   - **填寫範本**：直接給可貼上 ChatGPT 或文件的範本句。
   - **範例**：用「個人讀書清單系統」當示意（不是 reference case，避免提前洩漏）。
   - **小心**：常見錯誤一句。

   For oneLiner: include both locales:
   - zh-TW 範本：`這是一個 ___，幫助 ___ 解決 ___。`
   - en 範本：`This is a ___, helping ___ solve ___.`

   For successSignals: 重申來自 Vector wizard 的 `validateDraft` 規則：避免 `better / faster / 更好 / 更快 / 提升`。
4. `## 完成檢查表` — checkbox list: 十欄都有非空內容、successSignals 是可量測句、riskiestAssumptions 寫得讓你心痛、openQuestions 至少 1 條。
5. `## 常見坑` — 條列 5 個（例：把 nonProblems 寫成 vague 形容詞、successSignals 是動作不是結果、constraints 漏掉法規）。

- [ ] **Step 4: Write `docs/methodology/stages/1-frame/agent-script.md` (Layer C, English)**

Required sections (English only):

1. `# Stage 1 — Frame: Agent Script` — one-paragraph statement of intent.
2. `## Inputs` — list: a free-form system description from the user, optional context (existing docs, pasted notes).
3. `## Output` — file path `system-brief.md` (markdown) plus an embedded fenced JSON block tagged `<!-- schema: system-brief -->` matching `docs/methodology/schemas/system-brief.schema.json`.
4. `## Steps` — numbered, deterministic:
   1. Ask the user (or read the input) for the seven prompts: oneLiner, top problems, non-problems, target users, success signals, unique value, key metrics. *Each prompt has a fixed wording — list them verbatim.*
   2. Ask follow-ups for constraints, riskiestAssumptions, openQuestions. List the verbatim prompts.
   3. Compose the markdown narrative.
   4. Emit the JSON block. **Set `schemaVersion` to `"0.1"`.** Strings stay in the user's locale; keys stay English.
   5. Self-check: count required fields, confirm none of `goal.successSignals` matches `better / faster / 更好 / 更快 / 提升`.
5. `## Failure modes` — bullet list: refuse to fabricate riskiestAssumptions; if user cannot answer, surface to `openQuestions` and continue.
6. `## Validation` — instruct the agent to run `bun run methodology:validate` after writing the file (or to read the schema and run the same checks mentally if no shell).
7. `## Schema reference` — relative link to `../../schemas/system-brief.schema.json`.

- [ ] **Step 5: Write `docs/methodology/reference-case/README.md`**

Required sections (zh-TW):

1. `# Reference Case：內部報表平台` — one paragraph stating subject choice and why (低領域特殊度、無政治包袱、跨團隊熟悉)。
2. `## 場景設定` — 5–8 行情境陳述：公司內部 Ops/Finance 兩個團隊，目前每週手動拉 Excel 報表，分別說明各自痛點。
3. `## 階段索引` — bullet list linking to `01-frame.md`、`02-decompose.md`、`03-slice.md`、`04-handoff/`。
4. `## 如何使用本範例` — three short paragraphs: 讀者可逐階段對照 stages/N-*/guide.md；可拿 04-handoff/*.feature-seed.json 直接貼進 `npx vector-wizard`；不要把 reference case 當作模板，而是當作完成度的下限。

- [ ] **Step 6: Write `docs/methodology/reference-case/01-frame.md`**

Required structure:

1. Header `# Reference Case Stage 1 — Frame`
2. Opening prose summarizing the situation in 80–120 字 (zh-TW).
3. H2 sections for each of the 10 fields, each with a one-paragraph zh-TW elaboration that matches the JSON below.
4. End with the embedded JSON block (the executor copies this verbatim — content is fixed by the schema-validating tests). The actual file uses standard triple-backtick fences:

````markdown
<!-- schema: system-brief -->
```json
{
  "schemaVersion": "0.1",
  "oneLiner": "這是一個內部報表平台，幫助 Ops 與 Finance 團隊解決每週手動整理試算表的痛點。",
  "problem": [
    "Ops 與 Finance 每週各自花 4 小時以上手動匯總資料",
    "兩團隊出現口徑不一致的數字，導致月度檢討時對不上"
  ],
  "nonProblems": [
    "對外客戶儀表板",
    "即時串流分析"
  ],
  "targetUsers": [
    { "role": "Ops Analyst", "context": "每週 KPI 例會" },
    { "role": "Finance Lead", "context": "每月結帳" }
  ],
  "successSignals": [
    "每週報表產出時間從 4 小時降至 30 分鐘以內",
    "月度檢討時所有團隊使用同一份數字"
  ],
  "uniqueValue": "直接從正式環境資料倉儲拉取的單一事實來源，免除手動匯出。",
  "keyMetrics": [
    { "name": "每週報表產出時間", "target": "< 30 分鐘" },
    { "name": "自助式報表採用率", "target": "Q3 前 70% 團隊" }
  ],
  "constraints": [
    "必須使用既有 Snowflake 倉儲",
    "儀表板不得顯示原始 PII"
  ],
  "riskiestAssumptions": [
    "既有查詢層在規模化下效能足夠",
    "團隊真的會採用而不是回頭用試算表"
  ],
  "openQuestions": [
    "儀表板 schema 由誰負責定義？",
    "歷史 Excel 檔是否需要遷移？"
  ]
}
```
````

- [ ] **Step 7: Run the validation suite**

Run: `bun run methodology:validate`
Expected: PASS — the reference-case sweep now picks up `01-frame.md` and validates the embedded `system-brief` block.

- [ ] **Step 8: Commit**

```bash
git add docs/methodology/stages/1-frame/ docs/methodology/reference-case/README.md docs/methodology/reference-case/01-frame.md tests/methodology/schemas.test.ts
git commit -m "docs: [methodology] stage 1 frame — three layers, reference case, sweep test"
```

---

## Task 9: Stage 2 — Decompose (3 layers + reference case 02)

**Files:**
- Create `docs/methodology/stages/2-decompose/methodology.md`
- Create `docs/methodology/stages/2-decompose/guide.md`
- Create `docs/methodology/stages/2-decompose/agent-script.md`
- Create `docs/methodology/reference-case/02-decompose.md`

- [ ] **Step 1: Write `methodology.md` (Layer A, zh-TW)**

Required sections:

1. `# Stage 2：Decompose（拆解：角色、領域、能力）` — opening paragraph: 為什麼 Frame 之後不直接切 feature？因為沒有共享詞彙、沒有事件序列，feature 切割會卡在「誰看到的什麼按鈕」層級。
2. `## 方法論組合與順序` — 4 sub-steps with their methods (Stakeholder Map → JTBD light → Single-developer Event Storming → Capability Map). 對每個 sub-step 寫 100–150 字段落，說明「為什麼這四步、為什麼這個順序」。
3. `## 為何不做工作坊版 Event Storming` — explicit tradeoff paragraph: workshop format 在小團隊／單人開發無法執行，本 MVP 採 markdown timeline 變體。
4. `## 產出兩份檔案` — explain the split: `domain-map.md` 是敘述+表格；`capability-list.json` 是結構化下游消費。
5. `## 與下游的對應` — capabilities → Stage 3 的 linkedCapabilities。
6. `## 進入下一階段的條件` — bulleted: 至少 3 個 capability、每個 capability 有至少 1 個 actor 與 1 個 job、所有 capability id 形如 `CAP-NNN`。

- [ ] **Step 2: Write `guide.md` (Layer B, zh-TW)**

Required sections:

1. `# Decompose 操作指南` — opens with time estimate (90–180 分鐘)。
2. `## 4 個小步驟一覽` — table with 步驟、時間、產出、需要的人。
3. `## 步驟 1：找出誰會用` — H3 with：要做什麼（畫 stakeholder 表），範本表格（columns: 角色 / 想得到什麼 / 痛點 / 影響力），範例填法（用 reference case 的 Ops Analyst / Finance Lead 但只取 1 行示意），常見坑。
4. `## 步驟 2：列出每個角色想完成的事（JTBD 精簡版）` — explain JTBD 的 “When ___ I want to ___ so I can ___” 句型，給 zh-TW 對應 `當 ___ 時，我想 ___，這樣我就能 ___`，1 行範例。
5. `## 步驟 3：把事件按時間序寫下來（Markdown 版 Event Storming）` — explain timeline 格式：以 markdown bullet 順序紀錄事件名稱（過去式動詞），不需要黏便利貼。
6. `## 步驟 4：歸納成 Capability` — explain how 合併 jobs+events 變成 capability；每個 capability 必填 id、name、description、actors、jobs、events。
7. `## 完成檢查表` — bullet list referencing 「進入下一階段的條件」。
8. `## 常見坑` — 5 條（例：actors 與 targetUsers 不一致、capability 名稱用實作名詞而非能力動詞、events 寫成 UI 動作而非業務事件）。

- [ ] **Step 3: Write `agent-script.md` (Layer C, English)**

Required sections (English only):

1. `# Stage 2 — Decompose: Agent Script`
2. `## Inputs` — `system-brief.md` from Stage 1 (must validate against `system-brief.schema.json`).
3. `## Outputs` — `domain-map.md` (narrative + role table + event timeline) and `capability-list.json` (structured).
4. `## Steps`:
   1. Read the `system-brief` JSON. Extract `targetUsers` as the seed for stakeholder rows.
   2. For each stakeholder, propose 1–3 JTBD statements; ask the user to confirm.
   3. Propose an event timeline as a bulleted list of past-tense events; ask the user to confirm or trim.
   4. Cluster jobs + events into capabilities. Assign IDs `CAP-001`, `CAP-002`, … (zero-padded, 3 digits).
   5. Emit `domain-map.md` (markdown) and the `capability-list` JSON block tagged `<!-- schema: capability-list -->`.
5. `## Validation` — run `bun run methodology:validate` (or mentally validate against the schema).
6. `## Failure modes` — refuse to invent stakeholders not in `system-brief.targetUsers`; surface gaps as `openQuestions` updates to the brief instead.
7. `## Schema reference` — relative link to `../../schemas/capability-list.schema.json`.

- [ ] **Step 4: Write `docs/methodology/reference-case/02-decompose.md`**

Required structure:

1. Header `# Reference Case Stage 2 — Decompose`.
2. Opening 80–120 字 zh-TW prose introducing the decomposition.
3. `## 角色表` — markdown table with 3 rows (Ops Analyst, Finance Lead, Data Engineer) × 4 columns (角色 / 想得到什麼 / 痛點 / 影響力).
4. `## JTBD 摘要` — bulleted list of 1–3 jobs per role.
5. `## 領域事件時間序` — bulleted list of past-tense events (UserAuthenticated → DashboardViewed → KPIBrowsed → KPIAddedToDashboard → ReportComposed → ReportSaved → ReportShared).
6. `## 能力清單（capability-list.json）` — followed by the embedded JSON block (verbatim, with standard triple-backtick fence):

````markdown
<!-- schema: capability-list -->
```json
{
  "schemaVersion": "0.1",
  "capabilities": [
    {
      "id": "CAP-001",
      "name": "Authenticated dashboard access",
      "description": "授權的內部使用者登入後，看見依其團隊範圍篩選的儀表板。",
      "actors": ["Ops Analyst", "Finance Lead"],
      "jobs": ["登入內部報表平台", "瀏覽我所屬團隊的儀表板"],
      "events": ["UserAuthenticated", "DashboardViewed"]
    },
    {
      "id": "CAP-002",
      "name": "Pre-built KPI catalog",
      "description": "常用 KPI（營收、流失率、庫存週轉）已預先建好，使用者免寫 SQL 即可加入儀表板。",
      "actors": ["Ops Analyst"],
      "jobs": ["瀏覽 KPI 目錄", "把 KPI 加進儀表板"],
      "events": ["KPIBrowsed", "KPIAddedToDashboard"]
    },
    {
      "id": "CAP-003",
      "name": "Self-serve report builder",
      "description": "使用者可由 KPI 元件組合自助式報表，不需工程師協助。",
      "actors": ["Ops Analyst", "Finance Lead"],
      "jobs": ["組合一份報表", "儲存報表", "分享報表"],
      "events": ["ReportComposed", "ReportSaved", "ReportShared"]
    }
  ]
}
```
````

- [ ] **Step 5: Run the validation suite**

Run: `bun run methodology:validate`
Expected: PASS — `02-decompose.md` JSON validates against `capability-list` schema; existing `01-frame.md` still passes.

- [ ] **Step 6: Commit**

```bash
git add docs/methodology/stages/2-decompose/ docs/methodology/reference-case/02-decompose.md
git commit -m "docs: [methodology] stage 2 decompose — three layers and reference case"
```

---

## Task 10: Stage 3 — Slice (3 layers + reference case 03)

**Files:**
- Create `docs/methodology/stages/3-slice/methodology.md`
- Create `docs/methodology/stages/3-slice/guide.md`
- Create `docs/methodology/stages/3-slice/agent-script.md`
- Create `docs/methodology/reference-case/03-slice.md`

- [ ] **Step 1: Write `methodology.md` (Layer A, zh-TW)**

Required sections:

1. `# Stage 3：Slice（從能力切到 feature 候選）` — opening paragraph framing the goal.
2. `## 方法論組合` — 4 sub-steps: Story Mapping (system-level main flow) → INVEST + Walking Skeleton + Vertical Slicing → MoSCoW → Simplified DAG。每個 60–120 字。
3. `## 為何 MoSCoW 必填、WSJF/RICE 選填` — explicit tradeoff: 沒有歷史速率資料時，量化分數會製造錯誤精準。
4. `## 切片原則` — bullet 5 條：垂直可交付、INVEST、Walking Skeleton 第一刀通過所有層、單刀不超過 1 個 sprint、相依降到最少。
5. `## 與下游的對應` — feature.id → Stage 4 各檔案的 metadata.title 來源；priority `must / should` 才會進入 Handoff（`could / wont` 暫不轉成 seed）。
6. `## 進入下一階段的條件` — at least 1 must, all features have linkedCapabilities, dependsOn 不形成循環。

- [ ] **Step 2: Write `guide.md` (Layer B, zh-TW)**

Required sections:

1. `# Slice 操作指南` — time estimate (90–180 分鐘)。
2. `## 4 個小步驟一覽` — table.
3. `## 步驟 1：寫主流程故事脊（Story Spine）` — explain `From left to right`：使用者從進入到完成主目標的高階故事順序。給 markdown 編號清單範本。
4. `## 步驟 2：垂直切片（Vertical Slicing + Walking Skeleton）` — 解釋為何不可橫切（前端／後端／資料庫各一排），第一刀必須讓使用者體驗一個最小可用流程。
5. `## 步驟 3：標 MoSCoW` — table with 必填規則：每個 feature 一個 priority；wont 也保留是為了顯示不做的事。
6. `## 步驟 4（選填）：補上分數` — 簡介 WSJF/RICE，提醒沒資料時別做。
7. `## 步驟 5：畫相依` — bullet rule: dependsOn 只列直接前置。
8. `## 完成檢查表` — referencing 進入下一階段的條件。
9. `## 常見坑` — 5 條。

- [ ] **Step 3: Write `agent-script.md` (Layer C, English)**

Required sections:

1. `# Stage 3 — Slice: Agent Script`.
2. `## Inputs` — `capability-list.json` from Stage 2 (validates against `capability-list.schema.json`).
3. `## Outputs` — `story-spine.md` (narrative) and `feature-candidates.json` (structured).
4. `## Steps`:
   1. Read the capability list. Build the story spine as a numbered list of high-level user beats covering at least one capability per beat.
   2. Propose vertical slices. For each, set `linkedCapabilities` from the capability list.
   3. Apply MoSCoW: every feature gets `must / should / could / wont`. Walking Skeleton must be `must`.
   4. Estimate `S / M / L / XL` (T-shirt size). Default to `M` when unsure.
   5. Compute `dependsOn`. Refuse cycles.
   6. Emit JSON tagged `<!-- schema: feature-candidates -->`.
5. `## Validation` — `bun run methodology:validate`.
6. `## Failure modes` — never invent capabilities not in input; if a slice needs a missing capability, raise to user.
7. `## Schema reference` — relative link to `../../schemas/feature-candidates.schema.json`.

- [ ] **Step 4: Write `docs/methodology/reference-case/03-slice.md`**

Required structure:

1. Header `# Reference Case Stage 3 — Slice`.
2. Opening 80–120 字 zh-TW prose.
3. `## Story Spine` — numbered list of 5–7 high-level steps for the reporting platform (例：使用者登入 → 看見團隊儀表板 → 瀏覽 KPI → 加 KPI 到儀表板 → 自組一份報表 → 儲存與分享)。
4. `## Feature Candidates` — explanatory paragraph then embedded JSON (verbatim, standard triple-backtick fences):

````markdown
<!-- schema: feature-candidates -->
```json
{
  "schemaVersion": "0.1",
  "features": [
    {
      "id": "FT-001",
      "title": "SSO 一鍵登入",
      "oneLineGoal": "內部使用者透過企業 SSO 登入並抵達個人化儀表板。",
      "linkedCapabilities": ["CAP-001"],
      "priority": "must",
      "estimatedSize": "M",
      "dependsOn": [],
      "rationale": "Walking Skeleton：在登入未通之前其他 feature 無法測。"
    },
    {
      "id": "FT-002",
      "title": "預建 KPI 目錄 v1",
      "oneLineGoal": "Ops Analyst 從 10 個基準 KPI 中挑選並加進儀表板。",
      "linkedCapabilities": ["CAP-002"],
      "priority": "must",
      "estimatedSize": "L",
      "dependsOn": ["FT-001"],
      "rationale": "驗證最危險假設：預建 KPI 能否覆蓋 70% 週報需求。"
    },
    {
      "id": "FT-003",
      "title": "自助式報表組合器 MVP",
      "oneLineGoal": "使用者由現有 KPI 組合一份可儲存的報表，不需寫 SQL。",
      "linkedCapabilities": ["CAP-003"],
      "priority": "should",
      "estimatedSize": "XL",
      "dependsOn": ["FT-002"],
      "rationale": "與試算表的差異化主要在這裡，但要等 KPI 目錄被採用後再開。"
    }
  ]
}
```
````

- [ ] **Step 5: Run validation**

Run: `bun run methodology:validate`
Expected: PASS — `03-slice.md` JSON validates against `feature-candidates` schema.

- [ ] **Step 6: Commit**

```bash
git add docs/methodology/stages/3-slice/ docs/methodology/reference-case/03-slice.md
git commit -m "docs: [methodology] stage 3 slice — three layers and reference case"
```

---

## Task 11: Stage 4 — Handoff (3 layers + reference case 04)

**Files:**
- Create `docs/methodology/stages/4-handoff/methodology.md`
- Create `docs/methodology/stages/4-handoff/guide.md`
- Create `docs/methodology/stages/4-handoff/agent-script.md`
- Create `docs/methodology/reference-case/04-handoff/README.md`
- Create `docs/methodology/reference-case/04-handoff/FT-001-sso-signin.feature-seed.json`
- Create `docs/methodology/reference-case/04-handoff/FT-002-kpi-catalog.feature-seed.json`

- [ ] **Step 1: Write `methodology.md` (Layer A, zh-TW)**

Required sections:

1. `# Stage 4：Handoff（產出 feature-seed）` — opening paragraph: 把 Stage 1–3 的結構壓成 N 個 feature-seed.json，貼進 Vector wizard 的 Draft Manager。
2. `## 為何不一次填滿 FeatureDraft` — explicit invariant restatement: Vector 的「AI 非權威」原則禁止 AI 自動填出完整 draft；Handoff 只填 metadata、goal.statement、impacts 草稿、story title 骨架。
3. `## 4 個小步驟` — Sub 4.1 Seed Prompt（reuse 模式）→ 4.2 LLM Conversion → 4.3 Lint（套用等價於 `validation.ts` 的規則）→ 4.4 Export（每個 must/should feature 一檔）。
4. `## 與 Vector wizard 的銜接` — `feature-seed.schemaVersion` 永遠追蹤 wizard 的 schemaVersion `"0.1"`；wizard 變動時，feature-seed schema 一同 bump。
5. `## 不會做的事` — 不自動填 acceptanceCriteria、不自動填 examples、不替使用者確認 risks。
6. `## 進入完成的條件` — N 個 feature-seed.json，全部通過 `feature-seed.schema.json` 與 wizard `validateDraft` 不阻擋。

- [ ] **Step 2: Write `guide.md` (Layer B, zh-TW)**

Required sections:

1. `# Handoff 操作指南` — time estimate (30–60 分鐘 per feature)。
2. `## 你需要先準備什麼` — `feature-candidates.json` from Stage 3、原 `system-brief.md` for boundary 傳遞。
3. `## 步驟 1：選出要做的 feature` — 取所有 `priority === "must" || "should"` 的 feature。
4. `## 步驟 2：用 Seed Prompt 產生草稿` — explain `seedPromptBuilder.ts` 模式，提供把 feature.title + owner + locale 帶入 prompt 的範本（可手動跑 ChatGPT 或交給 vector-pipeline-b skill）。
5. `## 步驟 3：把上游欄位回填` — 表格列出哪些欄位來自 system-brief，哪些來自 feature-candidates。具體：
   - `metadata.title` ← `feature.title`
   - `goal.statement` ← `feature.oneLineGoal`
   - `agentBoundaries.constraints` ← `system-brief.constraints`
   - `agentBoundaries.risks` ← `system-brief.riskiestAssumptions`
   - `agentBoundaries.openQuestions` ← `system-brief.openQuestions`
   - `goal.successSignals` ← 從 `system-brief.successSignals` 中挑與本 feature 相關者
6. `## 步驟 4：本地 lint` — bullet 三個 blocking conditions：title、goal.statement、≥1 story title 或 userStory。
7. `## 步驟 5：貼進 Vector wizard` — 開 `npx vector-wizard` → Draft Manager → Paste JSON。
8. `## 完成檢查表`：
   - 所有 must/should 都有 seed
   - 每個 seed 通過 wizard 不阻擋
   - 每個 seed 的 risks/openQuestions 都來自 system-brief 而非新增

- [ ] **Step 3: Write `agent-script.md` (Layer C, English)**

Required sections:

1. `# Stage 4 — Handoff: Agent Script`.
2. `## Inputs` — `system-brief.md` (system-brief JSON), `feature-candidates.json`.
3. `## Outputs` — one `<feature-id>.feature-seed.json` per `must`/`should` feature.
4. `## Steps`:
   1. Read both inputs.
   2. For each must/should feature:
      a. Construct seed prompt mirroring `src/features/spec-wizard/services/seedPromptBuilder.ts`.
      b. Generate the FeatureDraft fields. Set `schemaVersion` `"0.1"`. Set `metadata.locale` from input.
      c. Propagate boundary fields from `system-brief` (mapping table — duplicate from guide.md so the agent does not need to read both).
      d. Leave `acceptanceCriteria` and `examples` arrays empty unless explicitly observed in upstream artifacts. AI-inferred items go to `agentBoundaries.openQuestions`.
   3. Run lint: title non-empty, goal.statement non-empty, ≥1 story with title or userStory.
   4. Emit one file per feature.
5. `## Refusal rules` — never invent acceptance criteria; never auto-confirm risks.
6. `## Validation` — `bun run methodology:validate` (the sweep test will catch each new `*.feature-seed.json`).
7. `## Schema reference` — relative link to `../../schemas/feature-seed.schema.json`.

- [ ] **Step 4: Write `docs/methodology/reference-case/04-handoff/README.md`**

Required sections (zh-TW):

1. `# Reference Case Stage 4 — Handoff` — short intro.
2. `## 我們選了誰` — bullet: FT-001 (must) 與 FT-002 (must) 各產一檔；FT-003 priority `should` 為示範範圍取捨而本範例略過，正式跑會一併產出。
3. `## 檔案索引` — bullet list 兩個 `.feature-seed.json` 路徑。
4. `## 怎麼貼進 wizard` — 三步驟：`bun run dev`（或 `npx vector-wizard`）→ Draft Manager → Paste JSON。

- [ ] **Step 5: Write `FT-001-sso-signin.feature-seed.json`**

Create `docs/methodology/reference-case/04-handoff/FT-001-sso-signin.feature-seed.json`:

```json
{
  "schemaVersion": "0.1",
  "metadata": { "title": "SSO 一鍵登入", "owner": "", "locale": "zh-TW" },
  "summary": {
    "problem": "內部使用者目前缺乏統一登入入口，每個工具都要重設密碼。",
    "desiredOutcome": "使用者透過企業 SSO 登入後直接進入個人化儀表板。"
  },
  "goal": {
    "statement": "讓內部使用者透過企業 SSO 登入並抵達個人化儀表板。",
    "successSignals": [
      "新使用者首次登入時間少於 30 秒",
      "支援團隊每月密碼重設工單下降 80%"
    ]
  },
  "impacts": [
    { "id": "IM-001", "actor": "Ops Analyst", "impact": "免於記憶另一組密碼" },
    { "id": "IM-002", "actor": "Finance Lead", "impact": "登入後直接看到團隊儀表板" }
  ],
  "deliverables": [
    { "id": "DE-001", "name": "SSO 登入流程", "description": "整合企業 IdP 的 OIDC / SAML 流程" },
    { "id": "DE-002", "name": "個人化儀表板首頁", "description": "依登入身分顯示對應團隊儀表板入口" }
  ],
  "userActivities": [
    { "id": "UA-001", "actor": "Ops Analyst", "activity": "用企業帳號登入內部報表平台" }
  ],
  "epics": [
    {
      "id": "EP-001",
      "title": "登入與身分",
      "stories": [
        {
          "id": "US-001",
          "title": "SSO 一鍵登入",
          "userStory": "身為 Ops Analyst，我希望用企業 SSO 一鍵登入，這樣就不必再記另一組密碼。",
          "acceptanceCriteria": [],
          "examples": []
        }
      ]
    }
  ],
  "agentBoundaries": {
    "nonGoals": ["不支援外部客戶登入", "不取代現有人資系統"],
    "constraints": ["必須使用既有 Snowflake 倉儲", "儀表板不得顯示原始 PII"],
    "testExpectations": [],
    "risks": ["既有查詢層在規模化下效能不足", "團隊仍回頭用試算表"],
    "openQuestions": ["儀表板 schema 由誰負責定義？", "歷史 Excel 檔是否需要遷移？"]
  }
}
```

- [ ] **Step 6: Write `FT-002-kpi-catalog.feature-seed.json`**

Create `docs/methodology/reference-case/04-handoff/FT-002-kpi-catalog.feature-seed.json`:

```json
{
  "schemaVersion": "0.1",
  "metadata": { "title": "預建 KPI 目錄 v1", "owner": "", "locale": "zh-TW" },
  "summary": {
    "problem": "Ops Analyst 想看 KPI 必須請工程師寫 SQL，導致週報循環延遲。",
    "desiredOutcome": "10 個基準 KPI 直接可選並加進儀表板，免寫 SQL。"
  },
  "goal": {
    "statement": "讓 Ops Analyst 從 10 個預建 KPI 中挑選並加進儀表板。",
    "successSignals": [
      "Ops 團隊週報所需 KPI 中至少 70% 可由目錄直接取得",
      "新增 KPI 到儀表板的操作少於 60 秒"
    ]
  },
  "impacts": [
    { "id": "IM-001", "actor": "Ops Analyst", "impact": "免於排隊請工程師寫查詢" }
  ],
  "deliverables": [
    { "id": "DE-001", "name": "KPI 目錄 UI", "description": "可瀏覽、搜尋、加入儀表板" },
    { "id": "DE-002", "name": "10 個基準 KPI 定義", "description": "包含營收、流失率、庫存週轉等" }
  ],
  "userActivities": [
    { "id": "UA-001", "actor": "Ops Analyst", "activity": "從 KPI 目錄挑選並加進儀表板" }
  ],
  "epics": [
    {
      "id": "EP-001",
      "title": "KPI 目錄",
      "stories": [
        {
          "id": "US-001",
          "title": "瀏覽 KPI 目錄",
          "userStory": "身為 Ops Analyst，我希望瀏覽預建 KPI 目錄，這樣我就不用每次都麻煩工程師寫 SQL。",
          "acceptanceCriteria": [],
          "examples": []
        }
      ]
    }
  ],
  "agentBoundaries": {
    "nonGoals": ["不支援自定義 KPI 公式", "不取代既有 BI 工具"],
    "constraints": ["必須使用既有 Snowflake 倉儲", "儀表板不得顯示原始 PII"],
    "testExpectations": [],
    "risks": ["既有查詢層在規模化下效能不足", "預建 KPI 無法覆蓋 70% 週報需求"],
    "openQuestions": ["10 個基準 KPI 由誰決定？", "是否需要支援多語系 KPI 名稱？"]
  }
}
```

- [ ] **Step 7: Run validation**

Run: `bun run methodology:validate`
Expected: PASS — both `*.feature-seed.json` files validate against the schema and pass `validateDraft` without blocking errors.

- [ ] **Step 8: Commit**

```bash
git add docs/methodology/stages/4-handoff/ docs/methodology/reference-case/04-handoff/
git commit -m "docs: [methodology] stage 4 handoff — three layers and feature-seed reference cases"
```

---

## Task 12: Glossary

**Files:**
- Create `docs/methodology/glossary.md`

- [ ] **Step 1: Write the glossary**

Create `docs/methodology/glossary.md` (zh-TW headings, bilingual entries).

Required structure:

1. Header `# 方法論詞彙表（Glossary）`.
2. Short intro paragraph explaining the file's role: zh-TW ↔ en mapping for terms used in stage docs.
3. A markdown table with columns `中文 | English | 出處階段 | 一行解釋`. Required entries (executor adds anything else introduced by their writing in Tasks 8–11):

   | 中文 | English | 出處階段 | 一行解釋 |
   | --- | --- | --- | --- |
   | 系統定錨書 | System Brief | Frame | Stage 1 的 10 欄輸出。 |
   | 最危險假設 | Riskiest Assumption | Frame | 我們最害怕被證偽的事。 |
   | 開放問題 | Open Question | Frame | 尚未有答案、會影響後續判斷的問題。 |
   | 利害關係人圖 | Stakeholder Map | Decompose | 角色 / 利益 / 痛點 / 影響力。 |
   | 待完成的工作 | Jobs To Be Done | Decompose | 「當 ___ 時，我想 ___」。 |
   | 領域事件風暴 | Event Storming | Decompose | 以時間序列出領域事件；本書採 markdown 變體。 |
   | 能力清單 | Capability List | Decompose | 系統可以做哪些事的結構化清單。 |
   | 故事脊 | Story Spine | Slice | 主流程的高階步驟。 |
   | 垂直切片 | Vertical Slice | Slice | 跨層提供端到端最小價值的切片。 |
   | 行走骨架 | Walking Skeleton | Slice | 第一刀貫穿所有層，可運行可測。 |
   | 候選 feature | Feature Candidate | Slice | 通過 INVEST 與 MoSCoW 標記的 feature 草稿。 |
   | feature 種子 | Feature Seed | Handoff | 部分填妥的 FeatureDraft，貼入 Vector wizard。 |

- [ ] **Step 2: Verify methodology:validate still passes**

Run: `bun run methodology:validate`
Expected: PASS (no JSON changes).

- [ ] **Step 3: Commit**

```bash
git add docs/methodology/glossary.md
git commit -m "docs: [methodology] add zh-TW ↔ en glossary"
```

---

## Task 13: Agent skill `vector-pipeline-b`

**Files:**
- Create `.agents/skills/vector-pipeline-b/SKILL.md`
- Create `.agents/skills/vector-pipeline-b/stage-1-frame.md`
- Create `.agents/skills/vector-pipeline-b/stage-2-decompose.md`
- Create `.agents/skills/vector-pipeline-b/stage-3-slice.md`
- Create `.agents/skills/vector-pipeline-b/stage-4-handoff.md`

The skill stays thin: the entry SKILL.md owns the high-level flow; the four stage files are short stubs that link to the canonical `docs/methodology/stages/*/agent-script.md` so content stays in one place.

- [ ] **Step 1: Write `SKILL.md`**

Create `.agents/skills/vector-pipeline-b/SKILL.md`:

```markdown
---
name: vector-pipeline-b
description: Walk a system idea through a four-stage methodology pipeline (Frame → Decompose → Slice → Handoff) and emit `feature-seed.json` files compatible with the Vector wizard's Draft Manager. Use when starting from "I want to build system X" and you need to produce N feature specs ready for npx vector-wizard.
---

# Vector Pipeline B — System → Feature Seeds

This skill is the agent surface for **Path B** of the methodology library at `docs/methodology/`. The canonical sources are the `agent-script.md` files under `docs/methodology/stages/`; each `stage-*.md` in this directory is a short pointer that the agent reads before executing that stage.

## Pipeline overview

system idea → [1] Frame → system-brief.md (+ schema=system-brief)
            → [2] Decompose → domain-map.md (+ schema=capability-list)
            → [3] Slice → story-spine.md (+ schema=feature-candidates)
            → [4] Handoff → N × <feature-id>.feature-seed.json
            → npx vector-wizard → Draft Manager → Paste JSON

Each stage's JSON output is the next stage's structured input. Boundary fields (`constraints`, `risks`, `openQuestions`, `successSignals`) propagate from Frame to every Handoff feature-seed.

## Authoritative sources (read before changing behavior)

- Pipeline narrative: `docs/methodology/pipeline-b.md`
- Stage agent scripts (canonical): `docs/methodology/stages/{1-frame,2-decompose,3-slice,4-handoff}/agent-script.md`
- Schemas: `docs/methodology/schemas/*.schema.json`
- Reference case: `docs/methodology/reference-case/`
- Vector wizard types and validation: `src/features/spec-wizard/model/specTypes.ts`, `validation.ts`
- Seed prompt template (mirrored at Stage 4): `src/features/spec-wizard/services/seedPromptBuilder.ts`

## Entry steps for the agent

1. Confirm with the user which stage to start in. Default: Stage 1 if no prior artifacts exist.
2. Read the stage's stub here (`stage-N-*.md`), which links to the canonical `docs/methodology/stages/N-*/agent-script.md`.
3. Execute the steps in that script. Emit the declared output file(s).
4. Run `bun run methodology:validate` after each stage to confirm the JSON output validates.
5. Move to the next stage with the previous stage's JSON as input.

## Invariants (do not break)

- **AI is non-authoritative.** Inferred (not observed) requirements go to `agentBoundaries.openQuestions` or `risks`, never to stories or acceptance criteria.
- **Schema keys stay English.** Locale only affects string values.
- **`schemaVersion` is `"0.1"`** for all four schemas; `feature-seed.schemaVersion` tracks the Vector wizard's version.
- **Handoff does not auto-fill `acceptanceCriteria` or `examples`.** Those remain a human task inside the wizard.
- **Refuse to invent inputs.** If a stage needs information missing from the previous stage's output, raise back to the user — do not hallucinate.

## Maintenance guidance

Keep this skill in sync when these change:
- `docs/methodology/stages/*/agent-script.md` — primary source; update stub links if filenames move.
- `docs/methodology/schemas/*.schema.json` — schema version bumps require updating the invariants section.
- Vector wizard's `validation.ts` blocking conditions — Stage 4 lint rules must match.
```

- [ ] **Step 2: Write `stage-1-frame.md`**

Create `.agents/skills/vector-pipeline-b/stage-1-frame.md`:

```markdown
# Stage 1 — Frame (skill stub)

**Canonical source:** [`docs/methodology/stages/1-frame/agent-script.md`](../../docs/methodology/stages/1-frame/agent-script.md)

**Output schema:** [`docs/methodology/schemas/system-brief.schema.json`](../../docs/methodology/schemas/system-brief.schema.json)

**Reference:** [`docs/methodology/reference-case/01-frame.md`](../../docs/methodology/reference-case/01-frame.md)

Read the canonical agent script before executing. Quick recap of the inputs / outputs / refusal rules for in-context reference:

- **Input:** free-form system description from the user.
- **Output:** `system-brief.md` with embedded `<!-- schema: system-brief -->` JSON block.
- **Refusal:** never fabricate riskiestAssumptions; surface unknowns to `openQuestions`.
- **Validation:** `bun run methodology:validate`.
```

- [ ] **Step 3: Write `stage-2-decompose.md`**

Create `.agents/skills/vector-pipeline-b/stage-2-decompose.md`:

```markdown
# Stage 2 — Decompose (skill stub)

**Canonical source:** [`docs/methodology/stages/2-decompose/agent-script.md`](../../docs/methodology/stages/2-decompose/agent-script.md)

**Output schema:** [`docs/methodology/schemas/capability-list.schema.json`](../../docs/methodology/schemas/capability-list.schema.json)

**Reference:** [`docs/methodology/reference-case/02-decompose.md`](../../docs/methodology/reference-case/02-decompose.md)

Read the canonical agent script. Recap:

- **Input:** Stage 1 `system-brief` JSON.
- **Output:** `domain-map.md` (narrative + role table + event timeline) and an embedded `<!-- schema: capability-list -->` JSON block.
- **Refusal:** never invent stakeholders absent from `system-brief.targetUsers`.
- **Validation:** `bun run methodology:validate`.
```

- [ ] **Step 4: Write `stage-3-slice.md`**

Create `.agents/skills/vector-pipeline-b/stage-3-slice.md`:

```markdown
# Stage 3 — Slice (skill stub)

**Canonical source:** [`docs/methodology/stages/3-slice/agent-script.md`](../../docs/methodology/stages/3-slice/agent-script.md)

**Output schema:** [`docs/methodology/schemas/feature-candidates.schema.json`](../../docs/methodology/schemas/feature-candidates.schema.json)

**Reference:** [`docs/methodology/reference-case/03-slice.md`](../../docs/methodology/reference-case/03-slice.md)

Read the canonical agent script. Recap:

- **Input:** Stage 2 `capability-list` JSON.
- **Output:** `story-spine.md` and an embedded `<!-- schema: feature-candidates -->` JSON block. Every feature has a MoSCoW `priority`. Walking Skeleton must be `must`.
- **Refusal:** never invent capabilities absent from input. No cyclic `dependsOn`.
- **Validation:** `bun run methodology:validate`.
```

- [ ] **Step 5: Write `stage-4-handoff.md`**

Create `.agents/skills/vector-pipeline-b/stage-4-handoff.md`:

```markdown
# Stage 4 — Handoff (skill stub)

**Canonical source:** [`docs/methodology/stages/4-handoff/agent-script.md`](../../docs/methodology/stages/4-handoff/agent-script.md)

**Output schema:** [`docs/methodology/schemas/feature-seed.schema.json`](../../docs/methodology/schemas/feature-seed.schema.json)

**Reference:** [`docs/methodology/reference-case/04-handoff/`](../../docs/methodology/reference-case/04-handoff/)

Read the canonical agent script. Recap:

- **Input:** Stage 1 `system-brief` JSON + Stage 3 `feature-candidates` JSON.
- **Output:** one `<feature-id>.feature-seed.json` per `must`/`should` feature, partial `FeatureDraft` shape, `schemaVersion: "0.1"`.
- **Refusal:** never auto-fill `acceptanceCriteria` or `examples`. Inferred risks → `agentBoundaries.openQuestions`.
- **Validation:** `bun run methodology:validate` (the sweep test enforces both schema and wizard `validateDraft` lint).
```

- [ ] **Step 6: Verify everything still validates**

Run: `bun run methodology:validate`
Expected: PASS — no JSON changes; the new skill files are markdown only.

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/vector-pipeline-b/
git commit -m "feat: [skill] add vector-pipeline-b agent skill mirroring methodology stages"
```

---

## Task 14: End-to-end smoke test and final integration

**Files:**
- (No new files — this task only runs checks and updates existing files if the smoke test reveals gaps.)

- [ ] **Step 1: Run the full test suite**

Run: `bun run test`
Expected: PASS — including all wizard tests under `src/features/spec-wizard/__tests__/` and all methodology tests under `tests/methodology/`.

- [ ] **Step 2: Build sanity check**

Run: `bun run build`
Expected: PASS — Next.js build succeeds. Markdown files do not affect build.

- [ ] **Step 3: Manual paste smoke test**

Procedure:

1. Run `bun run dev`.
2. Open `http://localhost:3000` in a browser.
3. Open Draft Manager → Paste JSON.
4. Paste contents of `docs/methodology/reference-case/04-handoff/FT-001-sso-signin.feature-seed.json`.
5. Confirm the wizard imports without showing blocking errors and the title `SSO 一鍵登入` appears in Step 1.
6. Repeat with `FT-002-kpi-catalog.feature-seed.json`.

If the wizard reports blocking errors, return to Task 11 and adjust the feature-seed JSON to satisfy `validateDraft`. Re-run `bun run methodology:validate` until green, then return here.

- [ ] **Step 4: Self-review against MVP completion criteria (Spec §10)**

Tick each item; if any is missing, open the relevant prior task and complete it:

- [ ] `docs/methodology/README.md` and `pipeline-b.md` describe the full pipeline overview and B path.
- [ ] All four stages have three reader-layer files (`methodology.md`, `guide.md`, `agent-script.md`).
- [ ] All four JSON schemas exist with `schemaVersion: "0.1"`.
- [ ] Reference case is filled for all four stages.
- [ ] `glossary.md` covers all introduced methodology terms.
- [ ] `.agents/skills/vector-pipeline-b/` skill files reference the methodology docs.
- [ ] Schema validation tests pass.
- [ ] Manual paste smoke test of both feature-seeds succeeds.

- [ ] **Step 5: Final commit if anything was tweaked**

If Step 3 or Step 4 caused changes:

```bash
git add -A
git commit -m "chore: [methodology] post-smoke-test adjustments to reference case"
```

If nothing changed, skip the commit.

---

## Notes for the executor

- Every markdown file's section list is non-negotiable; the prose inside each section is the executor's craft. Where the plan provides example bullets or tables, treat them as the *floor* of content, not the ceiling.
- Reference-case JSON in Tasks 8 / 9 / 10 / 11 is fixed by validation tests — copy the JSON verbatim. Tweaking it requires re-running `bun run methodology:validate`.
- Run `bun run methodology:validate` after every file write. Failing fast saves rework.
- Commits are intentionally small (one per task) to make review and bisection easy.
