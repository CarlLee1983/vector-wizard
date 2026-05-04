export type AgentEvent =
  | { type: "system_init"; sessionId: string; cwd: string; model?: string }
  | { type: "assistant_text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; toolUseId: string; isError: boolean; content: string }
  | { type: "result"; sessionId: string; isError: boolean; durationMs?: number; numTurns?: number }
  | { type: "error"; message: string }

export type LocalAgentRequest = {
  prompt: string
  cwd: string
  signal?: AbortSignal
}

export type LocalAgentProvider = {
  readonly name: string
  send(request: LocalAgentRequest): AsyncIterable<AgentEvent>
}
