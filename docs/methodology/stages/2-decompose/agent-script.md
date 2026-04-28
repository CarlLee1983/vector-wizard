# Stage 2 — Decompose: Agent Script

This script tells an automation agent (or a Claude Code skill invocation) exactly how to produce Stage 2 artifacts from a validated `system-brief`. The script is deterministic: prompts are fixed, output shapes are fixed, validation is non-negotiable. The agent never invents stakeholders, jobs, or events the user did not provide; gaps surface as updates to the upstream `system-brief.openQuestions`.

## Inputs

- `system-brief.md` produced by Stage 1, including its embedded `<!-- schema: system-brief -->` JSON block. The block must validate against `docs/methodology/schemas/system-brief.schema.json` before this script begins. If validation fails, return to Stage 1 instead of continuing.
- The user's preferred locale for prose (`zh-TW` or `en`). Property names and event names stay English regardless of locale.

## Outputs

Two artifacts produced together:

1. `domain-map.md` — narrative + stakeholder table (角色 / 想得到什麼 / 痛點 / 影響力) + bulleted event timeline. Prose stays in the user's locale.
2. `capability-list.json` — structured capability list embedded in `domain-map.md` as a fenced JSON block tagged `<!-- schema: capability-list -->`. The JSON must conform to `docs/methodology/schemas/capability-list.schema.json`.

## Steps

1. **Read the `system-brief` JSON block.** Parse the embedded JSON block from `system-brief.md`. Extract `targetUsers` as the seed for stakeholder rows; copy each `role` and treat its `context` as a hint for the "想得到什麼" column. Do not drop any role.
2. **Propose JTBD statements per stakeholder.** For each row in the stakeholder table, draft 1–3 statements using the form `When ___ I want to ___ so I can ___` (or zh-TW `當 ___ 時，我想 ___，這樣我就能 ___`). Present them to the user and ask for explicit confirmation; only retain confirmed statements.
3. **Propose an event timeline.** Emit a bulleted list of past-tense PascalCase events covering the main flow from first contact to task completion (5–15 events). Ask the user to confirm, trim, or reorder; do not silently rewrite. Events must describe domain state changes, not UI interactions.
4. **Cluster jobs + events into capabilities.** Group statements that share a purpose and span 2–5 events into a capability. Assign IDs `CAP-001`, `CAP-002`, `CAP-003`, … (zero-padded, three digits, contiguous). Each capability must populate all six required fields: `id`, `name`, `description`, `actors`, `jobs`, `events`. `actors` values must come from the stakeholder table; never invent new end users.
5. **Emit `domain-map.md` and the embedded JSON block.** Write the markdown narrative (intro + stakeholder table + event timeline) in the user's locale, then place the comment marker `<!-- schema: capability-list -->` on its own line, followed by a ```json fenced block containing the capability list. Set `schemaVersion` to `"0.1"`. Property names stay English; description text stays in the user's locale.

## Validation

After writing the file, run:

```bash
bun run methodology:validate
```

This runs the reference-case sweep, which extracts the embedded JSON block, looks up the `capability-list` schema, and validates with Ajv. If running in a no-shell environment, read `docs/methodology/schemas/capability-list.schema.json` directly and confirm: `schemaVersion` equals `"0.1"`, `capabilities` is non-empty, every capability id matches `^CAP-\d{3}$`, and `actors`, `jobs`, `events` arrays are present with `actors` non-empty.

## Failure modes

- **Refuse to invent stakeholders not in `system-brief.targetUsers`.** If a needed actor is missing, surface the gap as a proposed update to `system-brief.openQuestions` (e.g. `"Should Data Engineer be promoted to a targetUser, or remain an internal supporting role?"`) and pause the script. Do not silently add a new end-user role.
- **If the user cannot confirm a JTBD statement, drop it.** Do not retain unconfirmed statements just to fill space; an empty `jobs` array on a capability is a blocking error and will be caught at Step 4.
- **If the proposed event timeline contains UI verbs (e.g. `ButtonClicked`, `ModalOpened`), reject it once and ask the user to restate as a domain state change.** Do not auto-rewrite; the wording belongs to the user.
- **Never produce fewer than 3 capabilities.** If clustering yields only 1–2, return to Step 3 and ask for additional events; an under-decomposed system will fail Stage 3 slicing downstream.
- **Never let `actors` reference a role absent from the stakeholder table.** Cross-check every capability's `actors` array against the table before emitting the JSON.

## Schema reference

[`../../schemas/capability-list.schema.json`](../../schemas/capability-list.schema.json)
