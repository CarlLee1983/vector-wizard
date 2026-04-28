# Stage 1 — Frame (skill stub)

**Canonical source:** [`docs/methodology/stages/1-frame/agent-script.md`](../../../docs/methodology/stages/1-frame/agent-script.md)

**Output schema:** [`docs/methodology/schemas/system-brief.schema.json`](../../../docs/methodology/schemas/system-brief.schema.json)

**Reference:** [`docs/methodology/reference-case/01-frame.md`](../../../docs/methodology/reference-case/01-frame.md)

Read the canonical agent script before executing. Quick recap of the inputs / outputs / refusal rules for in-context reference:

- **Input:** free-form system description from the user.
- **Output:** `system-brief.md` with embedded `<!-- schema: system-brief -->` JSON block.
- **Refusal:** never fabricate riskiestAssumptions; surface unknowns to `openQuestions`.
- **Validation:** `bun run methodology:validate`.
