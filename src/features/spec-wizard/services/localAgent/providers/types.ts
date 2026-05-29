export type SpawnAgentOptions = {
  prompt: string
  cwd: string
  /** true = 禁止寫入 / 執行外部命令（取代舊的 disallowedTools 字串清單）。 */
  readonly?: boolean
  signal?: AbortSignal
  spawn?: typeof import("node:child_process").spawn
  /** 測試用覆寫；預設由各 provider 決定（"claude" / "codex"）。 */
  binPath?: string
}

export type SpawnAgentResult = {
  text: string
  exitCode: number
}

export interface AgentProvider {
  readonly name: "claude" | "codex"
  spawn(opts: SpawnAgentOptions): Promise<SpawnAgentResult>
}
