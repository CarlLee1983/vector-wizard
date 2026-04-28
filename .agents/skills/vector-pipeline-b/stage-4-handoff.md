# Stage 4 — Handoff (skill stub)

**Canonical source:** [`docs/methodology/stages/4-handoff/agent-script.md`](../../../docs/methodology/stages/4-handoff/agent-script.md)

**Output schema:** [`docs/methodology/schemas/feature-seed.schema.json`](../../../docs/methodology/schemas/feature-seed.schema.json)

**Reference:** [`docs/methodology/reference-case/04-handoff/`](../../../docs/methodology/reference-case/04-handoff/)

Read the canonical agent script. Recap:

- **Input:** Stage 1 `system-brief` JSON + Stage 3 `feature-candidates` JSON.
- **Output:** one `<feature-id>.feature-seed.json` per `must`/`should` feature, partial `FeatureDraft` shape, `schemaVersion: "0.1"`.
- **Refusal:** never auto-fill `acceptanceCriteria` or `examples`. Inferred risks → `agentBoundaries.openQuestions`.
- **Validation:** `bun run methodology:validate` (the sweep test enforces both schema and wizard `validateDraft` lint).
