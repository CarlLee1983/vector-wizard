import { EventEmitter } from "node:events"
import { PassThrough, Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"
import { createClaudeProvider, parseStreamJsonLine } from "../services/localAgent/claudeProvider"
import type { AgentEvent } from "../services/localAgent/types"

describe("parseStreamJsonLine", () => {
  it("parses system init", () => {
    expect(
      parseStreamJsonLine(
        JSON.stringify({
          type: "system",
          subtype: "init",
          session_id: "s1",
          cwd: "/tmp",
          model: "claude-opus-4-7"
        })
      )
    ).toEqual([{ type: "system_init", sessionId: "s1", cwd: "/tmp", model: "claude-opus-4-7" }])
  })

  it("parses assistant text", () => {
    expect(
      parseStreamJsonLine(
        JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "Hello" }] }
        })
      )
    ).toEqual([{ type: "assistant_text", text: "Hello" }])
  })

  it("parses assistant tool_use", () => {
    expect(
      parseStreamJsonLine(
        JSON.stringify({
          type: "assistant",
          message: {
            content: [{ type: "tool_use", id: "tu1", name: "Read", input: { file_path: "x" } }]
          }
        })
      )
    ).toEqual([{ type: "tool_use", id: "tu1", name: "Read", input: { file_path: "x" } }])
  })

  it("parses user tool_result with string content", () => {
    expect(
      parseStreamJsonLine(
        JSON.stringify({
          type: "user",
          message: {
            content: [{ type: "tool_result", tool_use_id: "tu1", content: "ok", is_error: false }]
          }
        })
      )
    ).toEqual([{ type: "tool_result", toolUseId: "tu1", isError: false, content: "ok" }])
  })

  it("parses user tool_result with array content", () => {
    expect(
      parseStreamJsonLine(
        JSON.stringify({
          type: "user",
          message: {
            content: [
              {
                type: "tool_result",
                tool_use_id: "tu2",
                is_error: true,
                content: [{ type: "text", text: "boom" }]
              }
            ]
          }
        })
      )
    ).toEqual([{ type: "tool_result", toolUseId: "tu2", isError: true, content: "boom" }])
  })

  it("parses result", () => {
    expect(
      parseStreamJsonLine(
        JSON.stringify({
          type: "result",
          session_id: "s1",
          is_error: false,
          duration_ms: 5000,
          num_turns: 3
        })
      )
    ).toEqual([{ type: "result", sessionId: "s1", isError: false, durationMs: 5000, numTurns: 3 }])
  })

  it("flattens multiple content blocks in one assistant message", () => {
    const events = parseStreamJsonLine(
      JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Start" },
            { type: "tool_use", id: "t1", name: "Read", input: {} }
          ]
        }
      })
    )
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: "assistant_text", text: "Start" })
    expect(events[1]).toEqual({ type: "tool_use", id: "t1", name: "Read", input: {} })
  })

  it("ignores blank lines, malformed JSON, and unknown shapes", () => {
    expect(parseStreamJsonLine("")).toEqual([])
    expect(parseStreamJsonLine("not json")).toEqual([])
    expect(parseStreamJsonLine(JSON.stringify({ type: "unknown" }))).toEqual([])
    expect(parseStreamJsonLine(JSON.stringify({ no: "type" }))).toEqual([])
  })
})

function makeFakeChild(stdoutLines: string[], stderrText = "", exitCode = 0) {
  const stdout = Readable.from(stdoutLines.map((line) => line + "\n"))
  const stderr = Readable.from(stderrText ? [stderrText] : [])
  const child = new EventEmitter() as EventEmitter & {
    stdout: Readable
    stderr: Readable
    kill: ReturnType<typeof vi.fn>
    killed: boolean
  }
  child.stdout = stdout
  child.stderr = stderr
  child.kill = vi.fn(() => {
    child.killed = true
    return true
  })
  child.killed = false
  setImmediate(() => child.emit("close", exitCode))
  return child
}

describe("createClaudeProvider", () => {
  it("yields events from stdout lines in order", async () => {
    const fakeSpawn = vi.fn(() =>
      makeFakeChild([
        JSON.stringify({ type: "system", subtype: "init", session_id: "s1", cwd: "/tmp" }),
        JSON.stringify({
          type: "assistant",
          message: { content: [{ type: "text", text: "Hi" }] }
        }),
        JSON.stringify({
          type: "result",
          session_id: "s1",
          is_error: false,
          duration_ms: 100,
          num_turns: 1
        })
      ])
    )
    const provider = createClaudeProvider({ spawn: fakeSpawn as never })
    const events: AgentEvent[] = []
    for await (const ev of provider.send({ prompt: "hi", cwd: "/tmp" })) {
      events.push(ev)
    }
    expect(events.map((e) => e.type)).toEqual(["system_init", "assistant_text", "result"])
    expect(fakeSpawn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining([
        "--print",
        "--output-format",
        "stream-json",
        "--permission-mode",
        "bypassPermissions",
        "--add-dir",
        "/tmp",
        "hi"
      ]),
      expect.objectContaining({ cwd: "/tmp" })
    )
  })

  it("emits error event when claude exits non-zero", async () => {
    const fakeSpawn = vi.fn(() => makeFakeChild([], "auth missing", 1))
    const provider = createClaudeProvider({ spawn: fakeSpawn as never })
    const events: AgentEvent[] = []
    for await (const ev of provider.send({ prompt: "hi", cwd: "/tmp" })) {
      events.push(ev)
    }
    expect(events).toEqual([{ type: "error", message: "auth missing" }])
  })

  it("yields nothing and emits aborted error when signal already aborted", async () => {
    const fakeSpawn = vi.fn(() => makeFakeChild([]))
    const provider = createClaudeProvider({ spawn: fakeSpawn as never })
    const ac = new AbortController()
    ac.abort()
    const events: AgentEvent[] = []
    for await (const ev of provider.send({ prompt: "hi", cwd: "/tmp", signal: ac.signal })) {
      events.push(ev)
    }
    expect(events).toEqual([{ type: "error", message: "Aborted before start" }])
    expect(fakeSpawn).not.toHaveBeenCalled()
  })

  it("kills child process when signal aborts mid-stream", async () => {
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const child = new EventEmitter() as EventEmitter & {
      stdout: PassThrough
      stderr: PassThrough
      kill: ReturnType<typeof vi.fn>
      killed: boolean
    }
    child.stdout = stdout
    child.stderr = stderr
    child.killed = false
    child.kill = vi.fn(() => {
      child.killed = true
      stdout.end()
      stderr.end()
      setImmediate(() => child.emit("close", 0))
      return true
    })

    const fakeSpawn = vi.fn(() => child)
    const provider = createClaudeProvider({ spawn: fakeSpawn as never })
    const ac = new AbortController()

    const iterPromise = (async () => {
      const collected: AgentEvent[] = []
      for await (const ev of provider.send({ prompt: "hi", cwd: "/tmp", signal: ac.signal })) {
        collected.push(ev)
        if (ev.type === "system_init") ac.abort()
      }
      return collected
    })()

    stdout.write(JSON.stringify({ type: "system", subtype: "init", session_id: "s1", cwd: "/tmp" }) + "\n")

    const events = await iterPromise
    expect(events[0]?.type).toBe("system_init")
    expect(child.kill).toHaveBeenCalled()
  })
})
