import { spawn as defaultSpawn } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentEvent, LocalAgentProvider, LocalAgentRequest } from "./types"

type SpawnFn = typeof defaultSpawn

type StreamJsonContentBlock = {
  type: string
  text?: unknown
  id?: unknown
  name?: unknown
  input?: unknown
  tool_use_id?: unknown
  content?: unknown
  is_error?: unknown
}

type StreamJsonLine = {
  type?: string
  subtype?: string
  session_id?: unknown
  cwd?: unknown
  model?: unknown
  message?: { content?: StreamJsonContentBlock[] }
  is_error?: unknown
  duration_ms?: unknown
  num_turns?: unknown
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function flattenToolResultContent(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block && typeof block === "object" && (block as { type?: string }).type === "text") {
          const text = (block as { text?: unknown }).text
          return typeof text === "string" ? text : ""
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  return content == null ? "" : JSON.stringify(content)
}

export function parseStreamJsonLine(line: string): AgentEvent[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  let parsed: StreamJsonLine
  try {
    parsed = JSON.parse(trimmed) as StreamJsonLine
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") return []

  switch (parsed.type) {
    case "system": {
      if (parsed.subtype !== "init") return []
      const sessionId = asString(parsed.session_id)
      const cwd = asString(parsed.cwd)
      if (!sessionId || !cwd) return []
      const model = asString(parsed.model)
      return [{ type: "system_init", sessionId, cwd, ...(model ? { model } : {}) }]
    }
    case "assistant": {
      const blocks = parsed.message?.content ?? []
      const events: AgentEvent[] = []
      for (const block of blocks) {
        if (block.type === "text" && typeof block.text === "string") {
          events.push({ type: "assistant_text", text: block.text })
        } else if (block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string") {
          events.push({ type: "tool_use", id: block.id, name: block.name, input: block.input })
        }
      }
      return events
    }
    case "user": {
      const blocks = parsed.message?.content ?? []
      const events: AgentEvent[] = []
      for (const block of blocks) {
        if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
          events.push({
            type: "tool_result",
            toolUseId: block.tool_use_id,
            isError: Boolean(block.is_error),
            content: flattenToolResultContent(block.content)
          })
        }
      }
      return events
    }
    case "result": {
      const sessionId = asString(parsed.session_id) ?? ""
      const event: AgentEvent = {
        type: "result",
        sessionId,
        isError: Boolean(parsed.is_error),
        ...(typeof parsed.duration_ms === "number" ? { durationMs: parsed.duration_ms } : {}),
        ...(typeof parsed.num_turns === "number" ? { numTurns: parsed.num_turns } : {})
      }
      return [event]
    }
    default:
      return []
  }
}

export type ClaudeProviderOptions = {
  spawn?: SpawnFn
  binPath?: string
}

export function createClaudeProvider(opts: ClaudeProviderOptions = {}): LocalAgentProvider {
  const spawn = opts.spawn ?? defaultSpawn
  const binPath = opts.binPath ?? "claude"

  return {
    name: "claude-code",
    async *send({ prompt, cwd, signal }: LocalAgentRequest): AsyncIterable<AgentEvent> {
      if (signal?.aborted) {
        yield { type: "error", message: "Aborted before start" }
        return
      }

      const args = [
        "--print",
        "--output-format",
        "stream-json",
        "--verbose",
        "--permission-mode",
        "bypassPermissions",
        "--add-dir",
        cwd,
        prompt
      ]

      const child = spawn(binPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] })

      const onAbort = () => {
        if (!child.killed) {
          try {
            child.kill("SIGTERM")
          } catch {
            // ignore — process may already have exited
          }
        }
      }
      signal?.addEventListener("abort", onAbort)

      let stderrBuf = ""
      child.stderr?.on("data", (chunk: Buffer) => {
        stderrBuf += chunk.toString()
      })

      const exitPromise = new Promise<number>((resolve) => {
        child.once("close", (code) => resolve(code ?? 0))
      })

      try {
        if (!child.stdout) {
          yield { type: "error", message: "claude process produced no stdout stream" }
          return
        }
        const rl = createInterface({ input: child.stdout })
        for await (const line of rl) {
          for (const event of parseStreamJsonLine(line)) {
            yield event
          }
        }
        const code = await exitPromise
        if (code !== 0 && !signal?.aborted) {
          yield { type: "error", message: stderrBuf.trim() || `claude exited with code ${code}` }
        }
      } finally {
        signal?.removeEventListener("abort", onAbort)
        if (!child.killed) {
          try {
            child.kill("SIGTERM")
          } catch {
            // ignore
          }
        }
      }
    }
  }
}
