# AGENTS.md

This file provides shared guidance for all coding agents (Claude Code, Codex, Cursor, Copilot, etc.) operating in this repository.

## Project

`vector-agile-roadmap-wizard` — an internal Next.js (App Router) tool that walks non-technical users through an agile roadmap interview and exports an AI-coding-agent-ready YAML feature spec. Single-user, no backend persistence; drafts live in `localStorage` and as importable JSON.

The authoritative product/architecture spec is `docs/superpowers/specs/2026-04-26-agile-roadmap-wizard-design.md`. The implementation plan it executes from is `docs/superpowers/plans/2026-04-26-agile-roadmap-wizard.md`. Read the design doc before changing data model, validation, or YAML semantics.

## Commands

Package manager: **bun** (`bun.lock` is committed). `npm`/`pnpm` will work but bun is the source of truth.

```bash
bun install
bun run dev              # next dev
bun run build            # next build
bun run lint             # next lint
bun run test             # vitest run (one-shot)
bun run test:watch       # vitest watch mode

# Single test file
bunx vitest run src/features/spec-wizard/__tests__/yamlSerializer.test.ts

# Single test by name pattern
bunx vitest run -t "minimal valid draft"

# Run locally via npx (requires local source or npm link)
npx vector-wizard
```

There is no separate typecheck script — `next build` runs `tsc --noEmit` (the `tsconfig.json` has `noEmit: true`). Use `npx tsc --noEmit` for a faster type-only check.

## Architecture

### Two-layer split

- `bin/cli.js` — CLI entry point for `npx` support.
- `app/` — Next.js App Router shell. Two API routes only: `app/api/generate-spec/route.ts` (normalize draft → YAML + summary + validation) and `app/api/assist/route.ts` (mock LLM rewrite / quality-check). Routes are thin: parse, type-guard, delegate to services, return JSON.
- `src/features/spec-wizard/` — All real logic. Feature is self-contained; nothing else in `src/` exists. Path alias `@/*` → `./src/*`.

### Module layout inside `src/features/spec-wizard/`

| Folder                        | Role                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model/`                      | `specTypes.ts` (canonical `FeatureDraft` and `ValidationIssue` types), `defaultDraft.ts` (empty draft factory), `validation.ts` (loose rules)        |
| `services/`                   | `yamlSerializer.ts` (custom YAML emitter — **no js-yaml dependency**), `summary.ts` (human-readable markdown), `assistService.ts` (mock LLM adapter) |
| `persistence/draftStorage.ts` | `localStorage` autosave + JSON import/export                                                                                                         |
| `components/`                 | `Wizard.tsx` (state + step navigation), `WizardStep.tsx`, `FieldArray.tsx`, `ReviewPanel.tsx`                                                        |
| `i18n/`                       | `I18nContext.tsx` (React context), `dictionaries.ts` (`zh-TW` + `en` flat key map)                                                                   |
| `api/contracts.ts`            | Request/response types shared between the route handlers and the client                                                                              |
| `__tests__/`                  | Vitest specs, one per service/route/flow                                                                                                             |

### Data flow

```
React Wizard state (FeatureDraft)
  ├─ autosave → localStorage  (persistence/draftStorage.ts)
  ├─ POST /api/generate-spec  → normalizeDraftForExport → YAML string + summary + ValidationResult
  ├─ POST /api/assist          → assistService (rewrite | quality_check) → suggestion only, never mutates draft
  └─ Draft Manager import      → importDraftJson / importDraftYaml → normalizeDraft → new draft entry
```

The frontend always manipulates the structured `FeatureDraft`, never YAML strings. YAML is only produced at the export boundary.

### Invariants — do not break these

These come from the design spec; tests in `__tests__/` enforce most of them:

- **YAML keys stay English** regardless of UI locale. The locale only affects UI labels, helper text, validation messages, and summary text.
- **Draft schema is separate from YAML schema.** `FeatureDraft` (internal) ≠ the `{ schemaVersion, metadata, summary, productSpec, agentSpec }` shape produced by `normalizeDraftForExport`. Future migrations rely on this seam.
- **`schemaVersion` is `"0.2"`** in the exported YAML（自 2026-04-28 起，新增 `metadata.{id,horizon,priority,dependsOn}` 四個選填欄位）；bump explicitly if you change the YAML shape.
- **Validation is intentionally loose.** Only three conditions are blocking errors: missing `metadata.title`, missing `goal.statement`, no user story. Everything else is a non-blocking warning. Blocking errors stop YAML download but must still allow JSON draft export.
- **AI is non-authoritative.** `assistService` returns suggestions, warnings, assumptions, open questions — it must never directly mutate the draft, add stories/criteria/examples, or be required for Wizard completion. Any inferred requirement surfaces as an assumption/warning/open question.
- **LLM keys are server-side only.** Real provider calls go through API routes, never from the client. Current code ships a mock provider; add new providers behind the same `AssistRequest`/`AssistResponse` contract.
- **Immutable updates.** All draft updates use spread/copy patterns (see `Wizard.tsx#updateStory`). Never mutate state in place.
- **Drafts are portable.** They can be exported/imported as JSON files or directly pasted into the Draft Manager UI as raw JSON strings.
- **YAML 匯入經 normalizeDraft**：反向解析 (`yamlToDraft`) 必須走與 JSON 匯入相同的 `normalizeDraft()` 路徑，讓 legacy migration 不重複實作。

### YAML serializer

`services/yamlSerializer.ts` is a hand-rolled emitter that always quotes strings via `JSON.stringify`. If you need richer YAML features (anchors, multiline literals, comments), check whether the existing tests still pass before swapping in a library — current tests assume this exact output shape.

### i18n

Adding a UI string: extend the `MessageKey` union in `i18n/dictionaries.ts` and provide both `zh-TW` and `en` entries. Missing entries are a TypeScript error. Validation messages reference dictionary keys via `messageKey` on `ValidationIssue` so the UI translates them at render time.

## Testing

- Vitest with `environment: "jsdom"`, `globals: true`, setup file at `src/features/spec-wizard/test/setup.ts` (loads `@testing-library/jest-dom/vitest`).
- Path alias `@` resolves to `./src` in tests too (configured in `vitest.config.ts`).
- Test fixtures: `src/features/spec-wizard/test/fixtures.ts` exports `minimalValidDraft()`. Prefer extending it over hand-building drafts in each test.
- Route handlers are tested by importing `POST` directly and passing a `Request` — see `__tests__/generateSpecRoute.test.ts`.

## Conventions inherited from global config

- All commit messages, PR descriptions, code comments, and conversational responses default to **Traditional Chinese (Taiwan)**. Switch to English only on explicit request.
- Commit format: `<type>: [<scope>] <subject>` (feat / fix / docs / refactor / test / chore / perf / ci).

## Repository Skills

- `.agents/skills/vector-analyzer/` — Tool-assisted deep feature analysis using the Vector schema. Use `vector:analyze` to reverse-engineer existing code into Roadmap specifications.
- `.agents/skills/vector-pipeline-b/` — Walk a system idea through a four-stage methodology pipeline (Frame → Decompose → Slice → Handoff) and emit `feature-seed.json` files compatible with the Vector wizard's Draft Manager. Use when starting from "I want to build system X" and you need to produce N feature specs ready for npx vector-wizard.
