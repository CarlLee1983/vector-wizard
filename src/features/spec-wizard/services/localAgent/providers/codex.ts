import { spawn as defaultSpawn, type ChildProcess } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentEvent } from "../types"
import type { AgentProvider, SpawnAgentOptions, SpawnAgentResult } from "./types"

type CodexItem = {
  type?: unknown
  text?: unknown
}

type CodexJsonLine = {
  type?: string
  message?: unknown
  item?: CodexItem
  error?: { message?: unknown }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

// 事件 schema 以本機 `codex exec --json`（codex-cli 0.134.0）真實輸出校正（決策 B）。
// 觀察到的事件：thread.started / turn.started / item.completed / turn.completed / error / turn.failed。
// 採「只認得需要的、其餘忽略」策略，故未知 type（含 reasoning item、token usage 等）一律回 []。
export function parseCodexJsonLine(line: string): AgentEvent[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  let parsed: CodexJsonLine
  try {
    parsed = JSON.parse(trimmed) as CodexJsonLine
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") return []

  switch (parsed.type) {
    // 完整 assistant 訊息：新版 codex 以 item.completed 承載，item.type === "agent_message"、文字在 item.text。
    // exec --json 不發增量 delta，故無重複累積疑慮。
    case "item.completed": {
      const item = parsed.item
      if (item && typeof item === "object" && item.type === "agent_message") {
        const text = asString(item.text)
        return text ? [{ type: "assistant_text", text }] : []
      }
      return []
    }
    // 一個 turn 正常結束。
    case "turn.completed": {
      return [{ type: "result", sessionId: "", isError: false }]
    }
    // 串流中的錯誤事件，top-level message 為字串。
    case "error": {
      const message = asString(parsed.message) ?? "codex error"
      return [{ type: "error", message }]
    }
    // turn 失敗（例如模型不支援），錯誤訊息在 error.message。
    case "turn.failed": {
      const message = asString(parsed.error?.message) ?? "codex turn failed"
      return [{ type: "error", message }]
    }
    default:
      return []
  }
}

async function spawnCodex(opts: SpawnAgentOptions): Promise<SpawnAgentResult> {
  if (opts.signal?.aborted) {
    throw new Error("Aborted before start")
  }

  const spawn = opts.spawn ?? defaultSpawn
  const binPath = opts.binPath ?? "codex"

  const args: string[] = [
    "exec",
    "--cd",
    opts.cwd,
    "--skip-git-repo-check",
    "--json",
    "--sandbox",
    opts.readonly ? "read-only" : "workspace-write",
    "-"
  ]

  const child = spawn(binPath, args, {
    cwd: opts.cwd,
    stdio: ["pipe", "pipe", "pipe"]
  }) as ChildProcess

  if (child.stdin) {
    child.stdin.end(opts.prompt)
  }

  const onAbort = () => {
    if (!child.killed) {
      try {
        child.kill("SIGTERM")
      } catch {
        // already exited
      }
    }
  }
  opts.signal?.addEventListener("abort", onAbort)

  let stderrBuf = ""
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString()
  })

  const exitPromise = new Promise<number>((resolve) => {
    child.once("close", (code) => resolve(code ?? 0))
  })

  let text = ""
  try {
    if (!child.stdout) {
      throw new Error("codex process produced no stdout stream")
    }
    const rl = createInterface({ input: child.stdout })
    for await (const line of rl) {
      for (const event of parseCodexJsonLine(line)) {
        if (event.type === "assistant_text") {
          text += event.text
        }
      }
    }
    const code = await exitPromise
    if (opts.signal?.aborted) {
      throw new Error("Aborted")
    }
    if (code !== 0) {
      throw new Error(stderrBuf.trim() || `codex exited with code ${code}`)
    }
    return { text, exitCode: code }
  } finally {
    opts.signal?.removeEventListener("abort", onAbort)
    if (!child.killed) {
      try {
        child.kill("SIGTERM")
      } catch {
        // ignore
      }
    }
  }
}

export const codexProvider: AgentProvider = {
  name: "codex",
  spawn: spawnCodex
}
