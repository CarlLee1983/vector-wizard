---
name: vector-analyzer
description: Analyze an existing codebase and emit a Vector-compatible `FeatureDraft` JSON that pastes cleanly into the Draft Manager of `npx vector-wizard`. Use when reverse-engineering an existing repo into an agile roadmap spec, seeding the Vector wizard with an AI-generated baseline draft, or producing JSON that imports without blocking validation errors.
---

# Vector Analyzer Skill

Reverse-engineer an existing project into a `FeatureDraft` JSON the Vector wizard can import. After the draft is loaded, the human reviews and exports YAML inside the wizard. Treat all AI inference as "assumption / open question", never as ground truth.

## Integration with vector-wizard

1. The user runs `npx vector-wizard` to start the Next.js app (`bin/cli.js` checks for `.next/`: present → `next start`, otherwise `next dev`; default port http://localhost:3000).
2. The agent uses this skill to analyze the repo and produce **a single** JSON object matching the `FeatureDraft` schema.
3. The user opens the Draft Manager → "Paste JSON" to load the draft. AI Assist (rewrite / quality_check), YAML export, and Markdown summary export all happen inside the wizard.
4. The wizard already has a "Seed Prompt" path that calls `src/features/spec-wizard/services/seedPromptBuilder.ts` to produce an LLM prompt. Its expected output format is exactly what this skill emits — this skill is the offline, codebase-aware variant of that flow.

## Authoritative sources (read before changing schema)

- Types: `src/features/spec-wizard/model/specTypes.ts`
- Empty skeleton: `src/features/spec-wizard/model/defaultDraft.ts`
- Loose validation rules: `src/features/spec-wizard/model/validation.ts`
- Seed prompt template: `src/features/spec-wizard/services/seedPromptBuilder.ts`
- Design invariants: `docs/superpowers/specs/2026-04-26-agile-roadmap-wizard-design.md`
- Shared agent rules: `AGENTS.md` (commands, architecture, invariants)

## Workflow

### 1. Discovery
- Read `AGENTS.md`, `README.md`, `package.json` to learn the stack, entry points, and commands.
- Use `Glob` / `Grep` to locate `services/`, `controllers/`, API routes, domain modules, and tests.
- For each module, record entry file, public surface, related tests, and design docs.

### 2. Analysis
For each module, extract:
- **Goal** — what business problem it solves; maps to `goal.statement`.
- **Success signals** — measurable, not vague. Avoid "better / faster / 更好 / 更快 / 提升" (triggers a `vague_success_signal` warning).
- **Impacts** — who is affected and how.
- **Deliverables** — concrete outputs (API, UI, report, CLI, …).
- **User activities** — real flows performed by each role.
- **User stories** — rewrite implementation logic as `As a [role], I want to [action], so that [benefit]`.
- **Acceptance criteria** — translate guard clauses, branches, and invariants into verifiable statements.
- **Examples** — convert tests/flows to Given/When/Then (`format: "given-when-then"`); fall back to `format: "natural-language"` + `scenario` when GWT does not fit.
- **Boundaries** — pull `nonGoals`, `constraints`, `testExpectations`, `risks`, `openQuestions` from README, design docs, TODOs, comments.

### 3. Generation
- Emit **a single** top-level JSON object. **JSON only**, no prose around it (matches the Draft Manager paste contract).
- Default string locale is Traditional Chinese (`locale: "zh-TW"`) unless the user requests `en`.
- Schema keys are always English. Locale only affects string content, never field names.
- Use the existing ID conventions (see `defaultDraft.ts`): `IM-001`, `DE-001`, `UA-001`, `EP-001`, `US-001`, `AC-001`, `EX-001`. Pad to three digits.
- Minimum to clear blocking validation: `metadata.title`, `goal.statement`, and at least one `epics[].stories[]` with `title` or `userStory`.
- To avoid common warnings, also fill: `successSignals`, `impacts`, `deliverables`, `userActivities`, each story's `acceptanceCriteria` and `examples`, plus `agentBoundaries.constraints`, `testExpectations`, `nonGoals`.

## FeatureDraft schema (essentials)

```ts
{
  metadata: { title: string; owner?: string; locale: "zh-TW" | "en" };
  summary: { problem?: string; desiredOutcome?: string };
  goal: { statement: string; successSignals: string[] };
  impacts: { id: string; actor: string; impact: string }[];
  deliverables: { id: string; name: string; description: string }[];
  userActivities: { id: string; actor: string; activity: string }[];
  epics: {
    id: string;
    title: string;
    stories: {
      id: string;
      title: string;
      userStory: string;
      acceptanceCriteria: { id: string; statement: string }[];
      examples: {
        id: string;
        format: "given-when-then" | "natural-language";
        given?: string;
        when?: string;
        then?: string;
        scenario?: string;
      }[];
    }[];
  }[];
  agentBoundaries: {
    nonGoals: string[];
    constraints: string[];
    testExpectations: string[];
    risks: string[];
    openQuestions: string[];
  };
}
```

## Invariants (do not break)

- **YAML keys stay English.** Locale only swaps display strings.
- **AI is non-authoritative.** Inferred (not observed) requirements go into `agentBoundaries.openQuestions` or `risks`, never into stories or acceptance criteria.
- **Locale matches content.** When `locale = "en"`, content must not contain Han characters (triggers `locale_content_mismatch` warning).
- **Draft schema ≠ exported YAML.** This skill emits the internal `FeatureDraft`. The wizard wraps it as `{ schemaVersion: "0.1", metadata, summary, productSpec, agentSpec }` only at YAML export time.
- **Preserve ID prefixes.** They keep the wizard UI and existing test fixtures aligned.
- **Examples must include `format`.** `given-when-then` requires at least one of `given/when/then`; `natural-language` requires `scenario`.

## Acceptance checklist

After generating, self-verify:
- [ ] Output parses with `JSON.parse`.
- [ ] `metadata.title` and `goal.statement` are non-empty.
- [ ] At least one story has a non-empty `title` or `userStory`.
- [ ] Each story has at least one `acceptanceCriteria` and one `examples` entry.
- [ ] `successSignals` are concrete, not "better / faster / 更好 / 更快 / 提升".
- [ ] AI-inferred items also appear in `agentBoundaries.openQuestions`.
- [ ] Pasting into Draft Manager (`npx vector-wizard`) advances through Steps 1–5 without blocking.

## Maintenance guidance (for future agents updating this skill)

Sync this file when these change:
- `src/features/spec-wizard/model/specTypes.ts` — fields changed → update the Schema section.
- `src/features/spec-wizard/model/validation.ts` — blocking errors or warning codes added/removed → update Invariants and Acceptance checklist.
- `src/features/spec-wizard/services/seedPromptBuilder.ts` — output shape changed → confirm this skill still aligns.
- `bin/cli.js` or `package.json` `bin` name changed → update the CLI name in "Integration with vector-wizard".
- `docs/superpowers/specs/*.md` — new design invariants → fold into Invariants.
