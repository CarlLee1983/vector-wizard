# Methodology Pipeline Design (Pre-Vector)

Date: 2026-04-28
Status: Approved for planning
Project: Vector

## 1. Purpose

The Vector wizard captures the **agile analysis** stage of feature development (Impact Mapping, Story Mapping, Specification by Example) but assumes the user already knows *what feature to build*. Real system development has multiple stages upstream of the wizard: vision framing, problem discovery, user research, system decomposition, feature slicing, and prioritization. Each stage has its own methodology.

This design defines a **methodology pipeline** that fills the gap from *system idea* to *Vector wizard input*. The deliverable for this iteration is **documentation, not code** — a structured methodology library that:

1. Gives small teams (and a single developer + AI agent) a shared vocabulary and a repeatable path from "I want to build a system" to "N feature specs ready for the Vector wizard".
2. Defines machine-checkable handoff schemas between stages so each stage's output can feed the next without information loss.
3. Becomes consumable by AI agents as an executable skill, while still readable by humans at multiple expertise levels.

## 2. Product Scope

### In scope for MVP

- **Path B (system → Vector) only.** The pipeline starts from "I want to build a system X" and ends at N `feature-seed.json` files that paste into the Vector wizard's Draft Manager.
- **Four stages**: Frame → Decompose → Slice → Handoff.
- **Three reader layers** for each stage: methodology rationale, execution guide, agent script.
- **JSON schemas** for inter-stage handoff artifacts.
- **Reference case**: a single worked example using "internal reporting platform" as subject.
- **One agent skill** (`.agents/skills/vector-pipeline-b/`) covering all four stages.
- **Schema validation tests** that check reference-case JSON against schemas.
- **Living in the Vector repo** under `docs/methodology/`.

### Out of scope for MVP

- Path A (vision/business → Vector) and Path C (problem/discovery → Vector). Placeholder entries only.
- Approach γ (modular methodology blocks with situation presets). Reserved for future evolution.
- Workshop-format facilitation guides (e.g., full Event Storming with sticky notes). Single-developer-friendly variants only.
- Real LLM provider wiring for the agent skill. The skill is markdown-only; integration with specific agents (Claude Code, Codex, Cursor) is a future task.
- A web UI for the methodology pipeline. Markdown + JSON only.
- Auto-syncing methodology output to the Vector wizard's UI. Handoff is via copy-paste JSON.

## 3. Pipeline Overview

### Three entry paths (only B is MVP)

- **Path A** — Vision/business → Vector. Methods: Lean Canvas, OKR, Vision Board.
- **Path B** — System concept → Vector. *MVP scope.*
- **Path C** — Problem/pain → Vector. Methods: Dual-Track Discovery, Opportunity Solution Tree, Hypothesis Statement.

All paths converge to the same handoff format: a set of `feature-seed.json` files compatible with the Vector wizard's `FeatureDraft` schema (partially filled).

### Path B stage flow

```
system idea
   │
   ▼
[1] Frame      ──→ system-brief.md
   │
   ▼
[2] Decompose  ──→ domain-map.md + capability-list.json
   │
   ▼
[3] Slice      ──→ feature-candidates.json
   │
   ▼
[4] Handoff    ──→ N × <feature-id>.feature-seed.json
                                 │
                                 ▼
                         Vector wizard Draft Manager
```

Each stage's JSON output is the next stage's structured input. Information added at Frame (e.g., risks, success signals) propagates to the final feature seeds rather than being re-collected.

## 4. Stage Definitions

### Stage 1 — Frame

**Goal**: Anchor the system in writing before decomposition starts.

**Methodology mix**: Problem Statement, Lean Canvas (trimmed), Hypothesis-driven (riskiest assumptions).

**Required fields** in `system-brief.md` (10 fields, F3 depth):

1. `oneLiner` — "This is a ___, helping ___ solve ___."
2. `problem` — 1–3 core problems being solved.
3. `nonProblems` — what this system does not solve (prevents scope creep).
4. `targetUsers` — who uses it most.
5. `successSignals` — measurable, concrete (vague signal warnings inherited from Vector wizard's `validation.ts`).
6. `uniqueValue` — differentiation from existing solutions.
7. `keyMetrics` — north star + 1–2 supporting metrics.
8. `constraints` — technical, legal, budget.
9. `riskiestAssumptions` — what we're most afraid of being wrong about.
10. `openQuestions` — unresolved key questions.

Fields 5, 8, 9, 10 map directly to Vector wizard schema (`successSignals`, `agentBoundaries.constraints`, `agentBoundaries.risks`, `agentBoundaries.openQuestions`) and propagate downstream.

### Stage 2 — Decompose

**Goal**: Turn the framed system into roles, domain vocabulary, and capabilities.

**Sub-steps**:

| Sub | Method | Output |
|-----|--------|--------|
| 2.1 Stakeholders | Stakeholder Map | role table (role / interest / pain / influence) |
| 2.2 JTBD | Jobs-To-Be-Done (light) | 1–3 core jobs per role |
| 2.3 Domain Events | Single-developer Event Storming (markdown timeline, no whiteboard) | event list |
| 2.4 Capabilities | Capability Map | `capability-list.json` |

**Outputs**:

- `domain-map.md` — narrative + role table + event timeline.
- `capability-list.json` — structured capability list for downstream consumption.

**Trade-off**: Workshop-format Event Storming is deferred. The MVP variant works for solo developers and small teams using markdown.

### Stage 3 — Slice

**Goal**: Convert capabilities into feature candidates with priority and dependencies.

**Sub-steps**:

| Sub | Method | Output |
|-----|--------|--------|
| 3.1 Story Spine | Story Mapping (system-level main flow) | `story-spine.md` |
| 3.2 Slicing | INVEST + Walking Skeleton + Vertical Slicing | feature draft list |
| 3.3 Prioritize | MoSCoW (required) + WSJF or RICE (optional) | priority |
| 3.4 Dependencies | Simplified DAG | feature-to-feature blockers |

**Output**: `feature-candidates.json`.

**Trade-off**: MoSCoW is required (every feature gets one of must/should/could/wont). WSJF/RICE is optional because, without historical velocity data, quantitative scoring tends to manufacture false precision. Teams with data can opt in.

### Stage 4 — Handoff

**Goal**: Produce N feature seeds — partially filled `FeatureDraft` JSONs — that paste into the Vector wizard's Draft Manager.

**Sub-steps**:

| Sub | Action |
|-----|--------|
| 4.1 Seed Prompt | Reuse the pattern from `src/features/spec-wizard/services/seedPromptBuilder.ts` |
| 4.2 LLM Conversion | Rewrite into `FeatureDraft` shape; uncertainties surface as assumptions/open questions, never as fabricated requirements |
| 4.3 Lint | Apply rules equivalent to `validation.ts` locally; flag blocking issues before paste |
| 4.4 Export | Emit one `<feature-id>.feature-seed.json` per Must/Should feature |

**Critical constraint**: Handoff must NOT auto-fill a complete `FeatureDraft`. Doing so violates Vector's "AI is non-authoritative" invariant. Handoff fills `metadata`, `goal.statement`, draft `impacts`, and story `title` skeletons only. Acceptance criteria, examples, and confirmation of all assumptions remain a human task inside the wizard.

## 5. Data Schemas

JSON Schemas are stored in `docs/methodology/schemas/`. The four output schemas:

### `system-brief.schema.json` (output of Stage 1)

```jsonc
{
  "schemaVersion": "0.1",
  "oneLiner": "string",
  "problem": ["string"],
  "nonProblems": ["string"],
  "targetUsers": [{ "role": "string", "context": "string" }],
  "successSignals": ["string"],
  "uniqueValue": "string",
  "keyMetrics": [{ "name": "string", "target": "string" }],
  "constraints": ["string"],
  "riskiestAssumptions": ["string"],
  "openQuestions": ["string"]
}
```

### `capability-list.schema.json` (output of Stage 2)

```jsonc
{
  "schemaVersion": "0.1",
  "capabilities": [
    {
      "id": "CAP-001",
      "name": "string",
      "description": "string",
      "actors": ["string"],
      "jobs": ["string"],
      "events": ["string"]
    }
  ]
}
```

### `feature-candidates.schema.json` (output of Stage 3)

```jsonc
{
  "schemaVersion": "0.1",
  "features": [
    {
      "id": "FT-001",
      "title": "string",
      "oneLineGoal": "string",
      "linkedCapabilities": ["CAP-001"],
      "priority": "must | should | could | wont",
      "estimatedSize": "S | M | L | XL",
      "dependsOn": ["FT-002"],
      "rationale": "string"
    }
  ]
}
```

### `feature-seed.schema.json` (output of Stage 4)

A partial `FeatureDraft` (see `src/features/spec-wizard/model/specTypes.ts`). Reuses the wizard's `schemaVersion: "0.1"` so the seed can be pasted into Draft Manager without translation.

### Schema rigor

- **Upstream schemas (Stages 1–3)**: loose. Required fields are minimal so users can save half-filled drafts and iterate.
- **Downstream schema (Stage 4 / feature-seed)**: aligns with the Vector wizard's blocking rules — `metadata.title`, `goal.statement`, and at least one story title required. Same blocking conditions as `validation.ts`.

### Versioning

- Each upstream schema (`system-brief`, `capability-list`, `feature-candidates`) carries its own `schemaVersion` starting at `"0.1"`.
- `feature-seed.schema.json` always tracks the Vector wizard's `schemaVersion`. Bumping the wizard's version requires bumping feature-seed.

## 6. Document Structure

### Repo layout

```
docs/methodology/
├── README.md                       # methodology map overview (path A/B/C entry)
├── pipeline-b.md                    # path B narrative end-to-end
├── stages/
│   ├── 1-frame/
│   │   ├── methodology.md          # A-layer: rationale, theory, when to use
│   │   ├── guide.md                # B-layer: checklist + example fills for non-tech users
│   │   └── agent-script.md         # C-layer: agent prompt + schema references
│   ├── 2-decompose/
│   │   ├── methodology.md
│   │   ├── guide.md
│   │   └── agent-script.md
│   ├── 3-slice/
│   │   ├── methodology.md
│   │   ├── guide.md
│   │   └── agent-script.md
│   └── 4-handoff/
│       ├── methodology.md
│       ├── guide.md
│       └── agent-script.md
├── schemas/
│   ├── system-brief.schema.json
│   ├── capability-list.schema.json
│   ├── feature-candidates.schema.json
│   └── feature-seed.schema.json
├── reference-case/
│   ├── README.md                   # case background, why this case
│   ├── 01-frame.md
│   ├── 02-decompose.md
│   ├── 03-slice.md
│   └── 04-handoff/
│       ├── README.md
│       └── *.feature-seed.json
└── glossary.md                     # zh-TW ↔ en methodology terms
```

### Three reader layers

| Layer | File | Audience | Style |
|-------|------|----------|-------|
| A | `methodology.md` | Self / internal team | Theory, why, decision rationale |
| B | `guide.md` | Non-technical stakeholders | Step-by-step checklist, fill-in examples |
| C | `agent-script.md` | AI agents | Structured prompt, input/output schema references, deterministic steps |

### Language

- A and B layers (`methodology.md`, `guide.md`) are in **Traditional Chinese (zh-TW)**.
- C layer (`agent-script.md`) is in **English** for cross-agent portability and consistency with `vector-analyzer/SKILL.md`.
- `glossary.md` provides zh-TW ↔ en mapping for methodology terms (JTBD, capability, event storming, etc.).
- JSON schema property names are always English. Schema descriptions can be bilingual.

## 7. Agent Skill Design

A single skill at `.agents/skills/vector-pipeline-b/`:

```
.agents/skills/vector-pipeline-b/
├── SKILL.md              # entry, overall flow, stage transitions, integration with vector-wizard
├── stage-1-frame.md      # mirrors stages/1-frame/agent-script.md
├── stage-2-decompose.md
├── stage-3-slice.md
└── stage-4-handoff.md
```

Why one skill instead of four sibling skills:

- The pipeline has strong sequential ordering — each stage consumes the previous stage's JSON.
- Single-skill context lets the agent maintain pipeline state without coordination overhead.
- Distinct from `vector-analyzer/`, which is an independent reverse-engineering tool, not a forward pipeline.

The agent skill files in `.agents/skills/vector-pipeline-b/` reference (and are kept in sync with) the canonical `agent-script.md` files under `docs/methodology/stages/`. The `docs/methodology/` directory remains the source of truth; the skill directory is the agent-facing surface.

## 8. Reference Case

**Subject**: Internal reporting platform.

**Why this case**: Common, low-domain-specificity, no political baggage, recognizable to most internal teams. Avoids overused examples like "membership system" while staying neutral.

**Coverage**: One filled file per stage demonstrating realistic outputs:

- `reference-case/01-frame.md` — fully filled `system-brief.md` example.
- `reference-case/02-decompose.md` — narrative `domain-map.md` plus inline `capability-list.json` example.
- `reference-case/03-slice.md` — `story-spine.md` plus inline `feature-candidates.json`.
- `reference-case/04-handoff/` — 2–3 representative `*.feature-seed.json` files (chosen Must/Should features only).

The reference case doubles as input fixtures for schema validation tests (Section 9).

## 9. Validation and Testing

The methodology library is documentation-first, but the JSON schemas and reference case must be machine-checked to prevent drift.

### Schema validation tests

A vitest suite (e.g., `tests/methodology/schemas.test.ts`) validates:

- Each `reference-case/*.json` (and JSON embedded in markdown via fenced blocks) parses against its declared schema using `ajv`.
- `feature-seed.json` files in `reference-case/04-handoff/` also pass the Vector wizard's loose validation rules from `validation.ts`.
- Schemas themselves are valid JSON Schema (meta-validation).

### What is *not* tested

- Markdown content lint (e.g., requiring agent-script files to contain specific section headings). Spec-level convention is sufficient.
- Cross-stage referential integrity beyond what schemas express (e.g., that every `linkedCapabilities` ID in feature-candidates exists in capability-list). Out of MVP; can be added if drift becomes a problem.

## 10. MVP Completion Criteria

The methodology pipeline MVP is complete when:

- `docs/methodology/README.md` and `pipeline-b.md` describe the full pipeline overview and B path.
- All four stages have three reader-layer files (`methodology.md`, `guide.md`, `agent-script.md`).
- All four JSON schemas exist in `docs/methodology/schemas/` with `schemaVersion: "0.1"`, except `feature-seed.schema.json` which tracks the wizard's version.
- Reference case (internal reporting platform) is filled for all four stages.
- `glossary.md` covers all introduced methodology terms.
- `.agents/skills/vector-pipeline-b/` skill files are created and reference the methodology docs.
- Schema validation tests pass.
- A user (or AI agent following the skill) can take "I want to build an internal reporting platform" through the four stages and produce at least one `feature-seed.json` that pastes into the Vector wizard without blocking errors.

## 11. Long-term Evolution (Approach γ)

The MVP is a fixed sequential pipeline (Approach α). Future evolution toward Approach γ (modular methodology blocks with situation presets) is preserved by:

- Each stage's `agent-script.md` is independently runnable given its declared input schema. Re-ordering or skipping stages is a future capability, not a current one.
- The schemas namespace methodology output independently of stage order. A `capability-list.json` produced via Path A's flow would conform to the same schema.
- Path A and Path C entries in `README.md` are stubbed with "out of MVP — see Path B" pointers, leaving room to fill in later.

## 12. Deferred Decisions for Implementation Planning

These do not block design but should be resolved during planning:

- Exact wording of `oneLiner` template across locales.
- Whether `agent-script.md` files should ship as YAML frontmatter + body (matching `vector-analyzer/SKILL.md`) or pure markdown.
- How the agent skill discovers and reads the canonical `docs/methodology/` files — relative path, embedded copy, or symlink.
- Whether to ship a tiny CLI helper (`bun run methodology:validate`) or rely on `bunx vitest` for schema checks.
- Naming of the npm-published artifact, if any (skill is repo-local for MVP; outward distribution is future).

## 13. Recommended Implementation Slice

A practical implementation sequence:

1. Create `docs/methodology/` directory with `README.md` and `pipeline-b.md` skeletons.
2. Author the four JSON schemas under `docs/methodology/schemas/` with `schemaVersion: "0.1"`.
3. Write `stages/1-frame/{methodology,guide,agent-script}.md`.
4. Write the reference case Stage 1 file (`reference-case/01-frame.md`) and confirm it validates.
5. Repeat steps 3–4 for Stages 2, 3, and 4.
6. Add `glossary.md`.
7. Set up the schema validation vitest suite. Confirm green.
8. Create `.agents/skills/vector-pipeline-b/` and mirror the agent-script content there.
9. Smoke test end-to-end: agent reads the skill, takes the reference case prompt, produces feature seeds, paste-imports into the wizard, and the wizard accepts them without blocking errors.
