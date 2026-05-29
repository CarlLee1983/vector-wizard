import type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
import { claudeProvider } from "./claude"

export function selectProvider(): AgentProvider {
  return claudeProvider
}

export function spawnAgent(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  return selectProvider().spawn(opts)
}

export type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
