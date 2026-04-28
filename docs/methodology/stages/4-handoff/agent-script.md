# Stage 4 — Handoff: Agent Script

This script tells an automation agent (or a Claude Code skill invocation) exactly how to convert a validated `feature-candidates.json` into N standalone `*.feature-seed.json` files, one per `must` or `should` feature. The script is deterministic: input filtering is fixed, the output shape is fixed, lint is non-negotiable. The agent never invents acceptance criteria, examples, or risks the user did not provide; AI-inferred items always go to `agentBoundaries.openQuestions`, never to a load-bearing field.

## Inputs

- `system-brief.md` — must contain a `<!-- schema: system-brief -->` JSON block validated against `docs/methodology/schemas/system-brief.schema.json`. The agent reads `constraints`, `riskiestAssumptions`, `openQuestions`, and `successSignals` from this block.
- `feature-candidates.json` — produced by Stage 3. Must validate against `docs/methodology/schemas/feature-candidates.schema.json`. The agent only processes features whose `priority` is `must` or `should`; `could` and `wont` are skipped.

## Outputs

One `<feature-id>-<short-slug>.feature-seed.json` file per `must` / `should` feature. Each file is standalone JSON (not embedded in markdown), validates against `docs/methodology/schemas/feature-seed.schema.json`, and passes wizard `validateDraft` with `blockingErrors === []`.

## Steps

1. **Read both inputs.** Parse `system-brief` (the embedded JSON block) and `feature-candidates.json`. Refuse to continue if either fails its schema. Filter `feature-candidates.features` to those with `priority` in `{ must, should }`.

2. **For each must/should feature:**

   a. **Construct the seed prompt** by mirroring `src/features/spec-wizard/services/seedPromptBuilder.ts`. Pass `{ title: feature.title, owner: "", locale }` where `locale` is the user-declared locale (`zh-TW` or `en`). Send the prompt to the LLM and parse the returned JSON.

   b. **Generate the FeatureDraft fields.** Set `schemaVersion` to `"0.1"`. Set `metadata.title` from `feature.title`. Set `metadata.owner` to `""` (a human fills this later in the wizard). Set `metadata.locale` from input. Set `goal.statement` from `feature.oneLineGoal`. Populate `summary`, `impacts`, `deliverables`, `userActivities`, and `epics[].stories[]` from the LLM output, keeping their content but discarding any of the LLM's own `acceptanceCriteria` or `examples` items (see step d).

   c. **Propagate boundary fields from `system-brief`** using this mapping table (duplicated here so the agent does not need to read the guide):

      | Feature-seed field | Source |
      | ------------------ | ------ |
      | `metadata.title` | `feature.title` (feature-candidates) |
      | `goal.statement` | `feature.oneLineGoal` (feature-candidates) |
      | `agentBoundaries.constraints` | `system-brief.constraints` (verbatim) |
      | `agentBoundaries.risks` | `system-brief.riskiestAssumptions` (verbatim) |
      | `agentBoundaries.openQuestions` | `system-brief.openQuestions` (verbatim) |
      | `goal.successSignals` | Subset of `system-brief.successSignals` relevant to this feature; empty array if none |

   d. **Leave `acceptanceCriteria` and `examples` arrays empty** (`[]`) unless explicitly observed in upstream artifacts (`system-brief` or `feature-candidates`). They are not. AI-inferred acceptance criteria, given/when/then examples, or extra risks must be redirected into `agentBoundaries.openQuestions` as questions, never written into the load-bearing fields.

3. **Lint each draft locally.** The three blocking conditions (mirroring `src/features/spec-wizard/model/validation.ts`):
   - `metadata.title` is non-empty after trim.
   - `goal.statement` is non-empty after trim.
   - At least one story across all epics has a non-empty `title` or `userStory`.

   Additionally strip any `goal.successSignals` entry whose normalized lowercase form is exactly `better`, `faster`, `更好`, `更快`, or `提升`. If a blocking condition fails, retry step 2a once with a tighter prompt; if it still fails, raise to the user — do not emit a partial seed.

4. **Emit one file per feature.** Write to `<output-dir>/<feature-id>-<short-slug>.feature-seed.json` (e.g. `FT-001-sso-signin.feature-seed.json`). Each file is standalone JSON; do not embed it inside markdown and do not aggregate multiple features into one file.

## Refusal rules

- **Never invent acceptance criteria.** If the LLM returns acceptance criteria not grounded in `system-brief` or `feature-candidates`, drop them and write a corresponding entry to `agentBoundaries.openQuestions` (e.g. `"待釐清：FT-001 的 acceptanceCriteria 由誰補？"`).
- **Never auto-confirm risks.** Risks come from `system-brief.riskiestAssumptions` verbatim. Do not reword, expand, or evaluate whether a risk is "still valid" — that judgment belongs to the human in their next retrospective.
- **Never invent examples.** Given/When/Then triples involve concrete behavioral commitments; emit `examples: []` and let the human author them inside the wizard.

## Validation

After writing all files, run:

```bash
bun run methodology:validate
```

The reference-case sweep test walks the `docs/methodology/reference-case/` tree and, for every `*.feature-seed.json` found, validates it against `feature-seed.schema.json` and runs wizard `validateDraft`, asserting `blockingErrors === []`. If running in a no-shell environment, read `docs/methodology/schemas/feature-seed.schema.json` directly and confirm structural conformance plus the three lint conditions above.

Note: unlike Stages 1–3 reference cases, Stage 4 reference cases are standalone `*.feature-seed.json` files rather than markdown with embedded `<!-- schema: ... -->` JSON blocks. The sweep test handles both forms; the schema link below is the canonical reference for the file shape.

## Schema reference

[`../../schemas/feature-seed.schema.json`](../../schemas/feature-seed.schema.json)
