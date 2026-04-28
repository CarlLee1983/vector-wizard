# Stage 1 — Frame: Agent Script

This script tells an automation agent (or a Claude Code skill invocation) exactly how to produce a `system-brief.md` artifact for Stage 1 of the methodology pipeline. It is deterministic: the prompts are fixed, the output shape is fixed, and the validation step is non-negotiable. The agent never invents content the user did not provide; gaps surface as `openQuestions`.

## Inputs

- A free-form system description from the user (one paragraph or longer; whatever they have).
- Optional context: existing docs, pasted notes, prior conversation transcripts, or links the user supplies.
- The user's preferred locale for the prose (`zh-TW` or `en`). The locale only affects string content; field names stay English.

## Output

A single file `system-brief.md` containing:

1. A markdown narrative covering all ten fields in the user's locale (one H2 per field is recommended).
2. An embedded fenced JSON block immediately preceded by the HTML comment marker `<!-- schema: system-brief -->`. The JSON must conform to `docs/methodology/schemas/system-brief.schema.json`.

## Steps

1. **Ask the user (or read the input) for the seven primary prompts.** Use these wordings verbatim. If the user already provided an answer in the free-form input, do not re-ask — restate what you understood and ask for confirmation.
   1. oneLiner: "What is this system in one sentence using the template `This is a ___, helping ___ solve ___.`?"
   2. problem: "List 1–5 concrete pain points this system tries to solve. One sentence each."
   3. nonProblems: "List 1–5 things that look related but this system explicitly will not solve, and why."
   4. targetUsers: "Name 1–5 user roles and the situation in which each will use this system."
   5. successSignals: "List 3–5 measurable signals that would let us declare success. Avoid the words better / faster / 更好 / 更快 / 提升."
   6. uniqueValue: "Why are we building this instead of buying or reusing an existing tool? One sentence."
   7. keyMetrics: "List 1–5 metrics we will watch after launch, each with a target value."
2. **Ask the three follow-up prompts.** Use these wordings verbatim:
   1. constraints: "What technical, regulatory, or organizational rules must this system never violate? List each as a complete sentence."
   2. riskiestAssumptions: "Name 1–3 assumptions that, if proven wrong, would mean we should not build this system."
   3. openQuestions: "What questions can we not yet answer, and who or what could answer them?"
3. **Compose the markdown narrative.** One H2 per field, in the order above. Use the user's wording wherever possible; tighten only for grammar. Do not invent items.
4. **Emit the embedded JSON block.** Place the comment marker `<!-- schema: system-brief -->` on its own line, then a ```json fenced block. Set `schemaVersion` to `"0.1"`. String values stay in the user's locale; property names stay English. Arrays use the same items the user gave (no merging, no rewording beyond minor tightening). Objects in `targetUsers` and `keyMetrics` use the schema's required keys (`role`/`context` and `name`/`target`).
5. **Self-check before declaring done.** In order:
   - Confirm all ten fields are present and non-empty.
   - Scan every entry of `successSignals` and reject any that contains `better`, `faster`, `更好`, `更快`, or `提升`. If a match exists, ask the user to rephrase that signal.
   - Confirm `riskiestAssumptions` has at least one item and that each item is phrased as a falsifiable statement (not a wish).
   - Confirm `openQuestions` is not an empty array.

## Failure modes

- **Refuse to fabricate `riskiestAssumptions`.** If the user cannot name a single assumption they fear being wrong about, surface a follow-up that asks them to imagine the post-mortem one year from now; do not invent one yourself.
- **If the user cannot answer a prompt, surface the gap to `openQuestions` and continue.** Do not block the whole script on a single missing answer. Example: if the user does not know the regulatory constraints, write `openQuestions: ["Which regulations apply (GDPR? PCI? financial reporting)? Need to confirm with legal."]` instead of leaving `constraints` empty.
- **If the user provides a `successSignal` containing forbidden vocabulary**, push back once with a concrete rewrite suggestion. Do not silently rewrite — the wording belongs to the user.
- **Never compress two fields into one.** If `problem` and `riskiestAssumptions` overlap, keep both: a problem describes what is broken today; an assumption describes what we are betting will turn out true.

## Validation

After writing the file, run:

```bash
bun run methodology:validate
```

This invokes the reference-case sweep, which extracts the embedded JSON block, looks up the `system-brief` schema, and validates with Ajv. If running in a no-shell environment, read `docs/methodology/schemas/system-brief.schema.json` directly and confirm: every required field is present, types match, `schemaVersion` equals `"0.1"`, and array constraints (`minItems`, `maxItems`) are satisfied.

## Schema reference

[`../../schemas/system-brief.schema.json`](../../schemas/system-brief.schema.json)
