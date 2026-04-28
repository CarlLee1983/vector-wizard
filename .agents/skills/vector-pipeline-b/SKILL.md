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
