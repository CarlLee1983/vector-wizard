# Stage 3 — Slice (skill stub)

**Canonical source:** [`docs/methodology/stages/3-slice/agent-script.md`](../../../docs/methodology/stages/3-slice/agent-script.md)

**Output schema:** [`docs/methodology/schemas/feature-candidates.schema.json`](../../../docs/methodology/schemas/feature-candidates.schema.json)

**Reference:** [`docs/methodology/reference-case/03-slice.md`](../../../docs/methodology/reference-case/03-slice.md)

Read the canonical agent script. Recap:

- **Input:** Stage 2 `capability-list` JSON.
- **Output:** `story-spine.md` and an embedded `<!-- schema: feature-candidates -->` JSON block. Every feature has a MoSCoW `priority`. Walking Skeleton must be `must`.
- **Refusal:** never invent capabilities absent from input. No cyclic `dependsOn`.
- **Validation:** `bun run methodology:validate`.
