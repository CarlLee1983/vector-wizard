import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"
import { parseStreamJsonLine, spawnAgent } from "../services/localAgent/claudeProvider"

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

function makeFakeChildForSpawnAgent(stdoutLines: string[], exitCode = 0) {
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

describe("spawnAgent", () => {
  it("collects assistant_text from stream and returns concatenated text", async () => {
    const lines = [
      JSON.stringify({
        type: "system",
        subtype: "init",
        session_id: "s1",
        cwd: "/tmp",
        model: "claude-haiku-4-5"
      }),
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "hello " }] }
      }),
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "world" }] }
      }),
      JSON.stringify({ type: "result", session_id: "s1", is_error: false })
    ]
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeChildForSpawnAgent(lines))
    const result = await spawnAgent({
      prompt: "do thing",
      cwd: "/tmp",
      disallowedTools: ["Bash", "Read"],
      spawn: fakeSpawn as never
    })
    expect(result.text).toBe("hello world")
    expect(result.exitCode).toBe(0)
  })

  it("passes --disallowed-tools flag with comma-joined list to claude argv", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(
        makeFakeChildForSpawnAgent([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
      )
    await spawnAgent({
      prompt: "do thing",
      cwd: "/tmp",
      disallowedTools: ["Bash", "Read", "Edit"],
      spawn: fakeSpawn as never
    })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    const idx = argv.indexOf("--disallowed-tools")
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(argv[idx + 1]).toBe("Bash,Read,Edit")
  })

  it("writes prompt to child stdin and does not include it in argv", async () => {
    const child = makeFakeChildForSpawnAgent([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await spawnAgent({
      prompt: "PROMPT-PAYLOAD",
      cwd: "/tmp",
      disallowedTools: ["Bash"],
      spawn: fakeSpawn as never
    })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    expect(argv).not.toContain("PROMPT-PAYLOAD")
    expect(child.stdinChunks).toEqual(["PROMPT-PAYLOAD"])
  })

  it("does not pass --disallowed-tools when list is empty", async () => {
    const fakeSpawn = vi
      .fn()
      .mockReturnValue(
        makeFakeChildForSpawnAgent([JSON.stringify({ type: "result", session_id: "s1", is_error: false })])
      )
    await spawnAgent({
      prompt: "x",
      cwd: "/tmp",
      disallowedTools: [],
      spawn: fakeSpawn as never
    })
    const argv = fakeSpawn.mock.calls[0][1] as string[]
    expect(argv).not.toContain("--disallowed-tools")
  })

  it("throws on non-zero exit with stderr message", async () => {
    const child = makeFakeChildForSpawnAgent([], 1)
    child.stderr = Readable.from(["fatal error\n"])
    const fakeSpawn = vi.fn().mockReturnValue(child)
    await expect(
      spawnAgent({ prompt: "x", cwd: "/tmp", disallowedTools: [], spawn: fakeSpawn as never })
    ).rejects.toThrow(/fatal error|exited with code 1/)
  })

  it("rejects when signal fires before spawn", async () => {
    const fakeSpawn = vi.fn().mockReturnValue(makeFakeChildForSpawnAgent([]))
    const ac = new AbortController()
    ac.abort()
    await expect(
      spawnAgent({
        prompt: "x",
        cwd: "/tmp",
        disallowedTools: [],
        spawn: fakeSpawn as never,
        signal: ac.signal
      })
    ).rejects.toThrow(/abort/i)
  })
})
