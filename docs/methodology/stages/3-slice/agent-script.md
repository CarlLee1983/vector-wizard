# Stage 3 — Slice: Agent Script

This script tells an automation agent (or a Claude Code skill invocation) exactly how to produce Stage 3 artifacts from a validated `capability-list`. The script is deterministic: the steps are fixed, the output shape is fixed, validation is non-negotiable. The agent never invents capabilities the user did not provide; if a slice needs a capability that does not exist in the input, the agent surfaces the gap to the user instead of fabricating one.

## Inputs

- `capability-list.json` produced by Stage 2 — typically embedded in `domain-map.md` under the `<!-- schema: capability-list -->` marker. The block must validate against `docs/methodology/schemas/capability-list.schema.json` before this script begins. If validation fails, return to Stage 2 instead of continuing.
- The user's preferred locale for prose (`zh-TW` or `en`). Property names, feature ids, capability ids, priority enums, and size enums stay English regardless of locale.

## Outputs

Two artifacts produced together:

1. `story-spine.md` — narrative, including the high-level main-flow story spine as a numbered list (5–7 beats). Prose stays in the user's locale.
2. `feature-candidates.json` — structured feature candidate list embedded in `story-spine.md` as a fenced JSON block tagged `<!-- schema: feature-candidates -->`. The JSON must conform to `docs/methodology/schemas/feature-candidates.schema.json`.

## Steps

1. **Read the capability list.** Parse the `capability-list.json` from Stage 2. Build the story spine as a numbered list of high-level user beats from first contact to main goal completion. Each beat must cover at least one capability from the input; if a beat needs a capability that is not in the list, raise it to the user and pause — do not invent one.
2. **Propose vertical slices.** Walk the story spine left to right and propose feature candidates that cut vertically through UI, logic, and data layers. For each candidate set `linkedCapabilities` to the relevant `CAP-NNN` ids drawn directly from the input list. Refuse horizontal slices (frontend-only or backend-only).
3. **Apply MoSCoW.** Every feature gets exactly one of `must / should / could / wont`. The Walking Skeleton — the shortest end-to-end path along the spine — must be `must` with `dependsOn: []`. When unsure between `must` and `should`, default to `should` to keep `must` minimal.
4. **Estimate `S / M / L / XL`.** Assign a T-shirt size to each feature based on relative effort. Default to `M` when unsure. Anything that feels larger than `XL` must be split before emitting.
5. **Compute `dependsOn`.** For each feature list only direct predecessors as `^FT-\d{3}$` ids; do not include transitive ancestors. Run a topological sort to confirm acyclicity. Refuse cycles — if one is found, return to Step 2 and re-slice.
6. **Emit JSON tagged `<!-- schema: feature-candidates -->`.** Write the markdown narrative (story spine + an explanatory paragraph for the feature candidates) in the user's locale, place the comment marker on its own line, then a ```json fenced block containing the feature candidates. Set `schemaVersion` to `"0.1"`. Property names stay English; `title`, `oneLineGoal`, and `rationale` text follow the user's locale. Avoid `better / faster / 更好 / 更快 / 提升` in `oneLineGoal`.

## Validation

After writing the file, run:

```bash
bun run methodology:validate
```

This runs the reference-case sweep, which extracts the embedded JSON block, looks up the `feature-candidates` schema, and validates with Ajv. If running in a no-shell environment, read `docs/methodology/schemas/feature-candidates.schema.json` directly and confirm: `schemaVersion` equals `"0.1"`, `features` is non-empty, every feature id matches `^FT-\d{3}$`, every `linkedCapabilities` id matches `^CAP-\d{3}$` and exists in the input capability list, every `priority` is in `{must, should, could, wont}`, every `estimatedSize` is in `{S, M, L, XL}`, and `dependsOn` is acyclic.

## Failure modes

- **Never invent capabilities not in the input.** If a slice seems to need a capability that does not exist in the supplied `capability-list`, surface the gap to the user (e.g. "Slice X requires capability `Notification delivery`, which is not in the capability list — should I return to Stage 2 to add it, or rescope the slice?") and pause. Do not fabricate a `CAP-NNN` id or attach the slice to an unrelated capability.
- **Refuse horizontal slices.** If the user proposes "frontend-only" or "backend-only" features, reject once with a concrete rewrite suggestion that bundles the layers into a single vertical slice. Do not silently rewrite.
- **Refuse cyclic `dependsOn`.** If topological sort fails, return to Step 2 with the cycle identified; do not emit the JSON.
- **Never produce zero `must` features.** At least one feature must be `must` and serve as the Walking Skeleton. If the user's clustering yields no `must`, ask them to identify the shortest end-to-end path before continuing.
- **Never let `linkedCapabilities` be empty for any feature.** Every feature must reference at least one capability; an unreferenced feature is out of scope.

## Schema reference

[`../../schemas/feature-candidates.schema.json`](../../schemas/feature-candidates.schema.json)
