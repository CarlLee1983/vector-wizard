import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useLocalAgent } from "../hooks/useLocalAgent"
import type { AgentEvent } from "../services/localAgent/types"

function sseResponse(events: AgentEvent[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      }
      controller.close()
    }
  })
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" }
  })
}

function makeIdFactory() {
  let n = 0
  return () => `id-${++n}`
}

describe("useLocalAgent", () => {
  it("starts with empty state", () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    const { result } = renderHook(() => useLocalAgent({ fetcher }))
    expect(result.current.messages).toEqual([])
    expect(result.current.isRunning).toBe(false)
  })

  it("sends prompt and processes SSE events into chat items", async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        { type: "system_init", sessionId: "s1", cwd: "/tmp" },
        { type: "assistant_text", text: "Reading file" },
        { type: "tool_use", id: "tu1", name: "Read", input: { file_path: "x" } },
        { type: "tool_result", toolUseId: "tu1", isError: false, content: "ok" },
        { type: "assistant_text", text: "Done" },
        { type: "result", sessionId: "s1", isError: false }
      ])
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useLocalAgent({ fetcher, idFactory: makeIdFactory() }))

    await act(async () => {
      await result.current.send("hello")
    })

    expect(result.current.isRunning).toBe(false)
    expect(result.current.messages.map((m) => m.kind)).toEqual(["user", "assistant", "tool", "assistant"])
    const tool = result.current.messages[2]
    expect(tool.kind).toBe("tool")
    if (tool.kind === "tool") {
      expect(tool.name).toBe("Read")
      expect(tool.result).toEqual({ content: "ok", isError: false })
    }
  })

  it("ignores empty/whitespace prompts", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    const { result } = renderHook(() => useLocalAgent({ fetcher }))
    await act(async () => {
      await result.current.send("   ")
    })
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.messages).toEqual([])
  })

  it("renders a system error item when HTTP request fails", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "Invalid request" }), {
          status: 400,
          headers: { "content-type": "application/json" }
        })
    ) as unknown as typeof fetch

    const { result } = renderHook(() => useLocalAgent({ fetcher, idFactory: makeIdFactory() }))
    await act(async () => {
      await result.current.send("test")
    })

    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.kind).toBe("system")
    if (last.kind === "system") {
      expect(last.isError).toBe(true)
      expect(last.text).toMatch(/Invalid request/)
    }
  })

  it("renders system error item when fetch throws", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down")
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useLocalAgent({ fetcher, idFactory: makeIdFactory() }))
    await act(async () => {
      await result.current.send("test")
    })
    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.kind).toBe("system")
    if (last.kind === "system") {
      expect(last.text).toBe("network down")
    }
  })

  it("clear() resets messages when not running", async () => {
    const fetcher = vi.fn(async () => sseResponse([{ type: "assistant_text", text: "hi" }])) as unknown as typeof fetch
    const { result } = renderHook(() => useLocalAgent({ fetcher }))
    await act(async () => {
      await result.current.send("hi")
    })
    expect(result.current.messages.length).toBeGreaterThan(0)
    act(() => {
      result.current.clear()
    })
    expect(result.current.messages).toEqual([])
  })
})
