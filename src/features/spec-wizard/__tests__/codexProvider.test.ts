import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"
import { codexProvider, parseCodexJsonLine } from "../services/localAgent/providers/codex"

// 事件 schema 以本機 `codex exec --json`（codex-cli 0.134.0）真實輸出校正（決策 B）：
//   {"type":"thread.started","thread_id":"..."}
//   {"type":"turn.started"}
//   {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"hi"}}
//   {"type":"turn.completed","usage":{...}}
//   {"type":"error","message":"..."}            // 例如 4xx
//   {"type":"turn.failed","error":{"message":"..."}}
describe("parseCodexJsonLine", () => {
  it("maps an item.completed agent_message to assistant_text", () => {
    expect(
      parseCodexJsonLine(
        JSON.stringify({ type: "item.completed", item: { id: "item_0", type: "agent_message", text: "Hello" } })
      )
    ).toEqual([{ type: "assistant_text", text: "Hello" }])
  })

  it("maps an error event to error", () => {
    expect(parseCodexJsonLine(JSON.stringify({ type: "error", message: "boom" }))).toEqual([
      { type: "error", message: "boom" }
    ])
  })

  it("maps turn.failed to error using nested error.message", () => {
    expect(
      parseCodexJsonLine(JSON.stringify({ type: "turn.failed", error: { message: "model not supported" } }))
    ).toEqual([{ type: "error", message: "model not supported" }])
  })

  it("maps turn.completed to a result event", () => {
    expect(parseCodexJsonLine(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1 } }))).toEqual([
      { type: "result", sessionId: "", isError: false }
    ])
  })

  it("ignores lifecycle and non-agent_message items", () => {
    expect(parseCodexJsonLine(JSON.stringify({ type: "thread.started", thread_id: "x" }))).toEqual([])
    expect(parseCodexJsonLine(JSON.stringify({ type: "turn.started" }))).toEqual([])
    expect(parseCodexJsonLine(JSON.stringify({ type: "item.completed", item: { type: "reasoning", text: "..." } }))).toEqual([])
  })

  it("ignores blank lines, malformed JSON, and shapes without a type", () => {
    expect(parseCodexJsonLine("")).toEqual([])
    expect(parseCodexJsonLine("not json")).toEqual([])
    expect(parseCodexJsonLine(JSON.stringify({ no: "type" }))).toEqual([])
  })
})

function makeFakeCodexChild(stdoutLines: string[], exitCode = 0) {
  const stdout = Readable.from(stdoutLines.map((l) => `${l}\n`))
  const stderr = Readable.from([])
  const stdinChunks: string[] = []
  const stdin = {
    end(chunk?: string) {
      if (typeof chunk === "string") stdinChunks.push(chunk)
    }
  }
  const child = new EventEmitter() as EventEmitter & {
    stdin: typeof stdin
    stdout: Readable
    stderr: Readable
    killed: boolean
    kill: (sig?: string) => boolean
    stdinChunks: string[]
  }
  child.stdin = stdin
  child.stdout = stdout
  child.stderr = stderr
  child.killed = false
  child.kill = () => {
    child.killed = true
    return true
  }
  child.stdinChunks = stdinChunks
  setTimeout(() => child.emit("close", exitCode), 0)
  return child
}

describe("codexProvider.spawn", () => {
  it("accumulates assistant_text and returns concatenated text", async () => {
    const lines = [
      JSON.stringify({ type: "thread.started", thread_id: "s1" }),
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "item.completed", item: { id: "item_0", type: "agent_message", text: "hello world" } }),
      JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1 } })
    ]
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeCodexChild(lines))
    const result = await codexProvider.spawn({
      prompt: "do thing",
      cwd: "/tmp",
      readonly: true,
      spawn: fakeSpawn as never
    })
    expect(result.text).toBe("hello world")
    expect(result.exitCode).toBe(0)
  })

  it("builds the expected argv and uses read-only sandbox when readonly", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(makeFakeCodexChild([JSON.stringify({ type: "turn.completed" })]))
    await codexProvider.spawn({
      prompt: "x",
      cwd: "/path/to/project",
      readonly: true,
      spawn: fakeSpawn as never
    })
    const [bin, argv] = fakeSpawn.mock.calls[0]
    expect(bin).toBe("codex")
    expect(argv).toEqual([
      "exec",
      "--cd",
      "/path/to/project",
      "--skip-git-repo-check",
      "--json",
      "--sandbox",
      "read-only",
      "-"
    ])
  })

  it("uses workspace-write sandbox when not readonly", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(makeFakeCodexChild([JSON.stringify({ type: "turn.completed" })]))
    await codexProvider.spawn({ prompt: "x", cwd: "/tmp", spawn: fakeSpawn as never })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    const idx = argv.indexOf("--sandbox")
    expect(argv[idx + 1]).toBe("workspace-write")
  })

  it("writes prompt to stdin and not into argv", async () => {
    const child = makeFakeCodexChild([JSON.stringify({ type: "turn.completed" })])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await codexProvider.spawn({ prompt: "PROMPT-PAYLOAD", cwd: "/tmp", spawn: fakeSpawn as never })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    expect(argv).not.toContain("PROMPT-PAYLOAD")
    expect(child.stdinChunks).toEqual(["PROMPT-PAYLOAD"])
  })

  it("throws on non-zero exit with stderr message", async () => {
    const child = makeFakeCodexChild([], 1)
    child.stderr = Readable.from(["Not logged in. Run 'codex login'\n"])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await expect(
      codexProvider.spawn({ prompt: "x", cwd: "/tmp", spawn: fakeSpawn as never })
    ).rejects.toThrow(/Not logged in|exited with code 1/)
  })

  it("rejects when signal fires before spawn", async () => {
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeCodexChild([]))
    const ac = new AbortController()
    ac.abort()
    await expect(
      codexProvider.spawn({ prompt: "x", cwd: "/tmp", spawn: fakeSpawn as never, signal: ac.signal })
    ).rejects.toThrow(/abort/i)
  })
})
