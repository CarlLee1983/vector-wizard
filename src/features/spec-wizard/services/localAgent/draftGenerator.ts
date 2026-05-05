import type { Locale } from "../../model/specTypes"
import { buildSeedPrompt } from "../seedPromptBuilder"
import type { SpawnAgentOptions, SpawnAgentResult } from "./claudeProvider"
import { spawnAgent as defaultSpawnAgent } from "./claudeProvider"
import { extractDraftJson } from "./draftJsonExtractor"

export type DraftGenerationResult =
  | { kind: "draft"; draft: unknown }
  | { kind: "parse_error"; raw: string }
  | { kind: "run_error"; message: string }

export type GenerateDraftInput = {
  title: string
  owner?: string
  locale: Locale
  cwd: string
  signal?: AbortSignal
  spawnAgent?: (opts: SpawnAgentOptions) => Promise<SpawnAgentResult>
}

const DRAFT_TOOL_LOCK = [
  "Bash",
  "Read",
  "Edit",
  "Write",
  "MultiEdit",
  "WebFetch",
  "WebSearch",
  "NotebookEdit",
  "TodoWrite",
  "Glob",
  "Grep"
]

export async function generateDraft(input: GenerateDraftInput): Promise<DraftGenerationResult> {
  const title = input.title?.trim() ?? ""
  if (!title) {
    return { kind: "run_error", message: "title is required" }
  }
  const spawn = input.spawnAgent ?? defaultSpawnAgent
  const prompt = buildSeedPrompt({ title, owner: input.owner, locale: input.locale })
  let text: string
  try {
    const out = await spawn({
      prompt,
      cwd: input.cwd,
      disallowedTools: DRAFT_TOOL_LOCK,
      signal: input.signal
    })
    text = out.text
  } catch (err) {
    return { kind: "run_error", message: err instanceof Error ? err.message : String(err) }
  }
  const extracted = extractDraftJson(text)
  if (!extracted.ok) {
    return { kind: "parse_error", raw: text }
  }
  return { kind: "draft", draft: extracted.value }
}
