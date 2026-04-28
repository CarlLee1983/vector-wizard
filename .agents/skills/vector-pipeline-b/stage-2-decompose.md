# Stage 2 — Decompose (skill stub)

**Canonical source:** [`docs/methodology/stages/2-decompose/agent-script.md`](../../../docs/methodology/stages/2-decompose/agent-script.md)

**Output schema:** [`docs/methodology/schemas/capability-list.schema.json`](../../../docs/methodology/schemas/capability-list.schema.json)

**Reference:** [`docs/methodology/reference-case/02-decompose.md`](../../../docs/methodology/reference-case/02-decompose.md)

Read the canonical agent script. Recap:

- **Input:** Stage 1 `system-brief` JSON.
- **Output:** `domain-map.md` (narrative + role table + event timeline) and an embedded `<!-- schema: capability-list -->` JSON block.
- **Refusal:** never invent stakeholders absent from `system-brief.targetUsers`.
- **Validation:** `bun run methodology:validate`.
