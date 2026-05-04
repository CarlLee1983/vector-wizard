import type { FeatureDraft } from "../../model/specTypes"
import { getActionById } from "./actionRegistry"
import { parseActionResult, type ActionResult } from "./actionResult"
import type { SpawnAgentOptions, SpawnAgentResult } from "./claudeProvider"
import { spawnAgent as defaultSpawnAgent } from "./claudeProvider"

export type RunActionInput = {
  actionId: string
  draft: FeatureDraft
  cwd: string
  signal?: AbortSignal
  spawnAgent?: (opts: SpawnAgentOptions) => Promise<SpawnAgentResult>
}

export async function runAction(input: RunActionInput): Promise<ActionResult> {
  const action = getActionById(input.actionId)
  if (!action) {
    return {
      kind: "run_error",
      actionId: input.actionId,
      message: `Unknown action: ${input.actionId}`
    }
  }
  const spawn = input.spawnAgent ?? defaultSpawnAgent
  let prompt: string
  try {
    prompt = action.promptTemplate({ draft: input.draft })
  } catch (err) {
    return {
      kind: "run_error",
      actionId: action.id,
      message: err instanceof Error ? err.message : String(err)
    }
  }
  try {
    const { text } = await spawn({
      prompt,
      cwd: input.cwd,
      disallowedTools: action.disallowedTools,
      signal: input.signal
    })
    return parseActionResult(text, action.id)
  } catch (err) {
    return {
      kind: "run_error",
      actionId: action.id,
      message: err instanceof Error ? err.message : String(err)
    }
  }
}
