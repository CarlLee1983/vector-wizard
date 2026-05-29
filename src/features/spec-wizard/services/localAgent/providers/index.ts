import type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
import { claudeProvider } from "./claude"
import { codexProvider } from "./codex"

let warned = false
function warnOnce(message: string): void {
  if (warned) return
  warned = true
  console.warn(message)
}

// 用 Record 而非 NodeJS.ProcessEnv：本 repo 的 Next 把 ProcessEnv 的 NODE_ENV 設為必填，
// 直接用 ProcessEnv 會讓測試傳入的 { VECTOR_AGENT } 字面量無法通過型別檢查。
// process.env 帶 [key: string]: string | undefined 索引簽章，可賦值給此 Record。
export function selectProvider(env: Record<string, string | undefined> = process.env): AgentProvider {
  const raw = env.VECTOR_AGENT?.toLowerCase()
  if (raw === "codex") return codexProvider
  if (raw && raw !== "claude") {
    warnOnce(`Unknown VECTOR_AGENT=${raw}, falling back to claude`)
  }
  return claudeProvider
}

export function spawnAgent(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  return selectProvider().spawn(opts)
}

export type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"
