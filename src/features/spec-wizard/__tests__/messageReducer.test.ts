import { describe, expect, it } from "vitest"
import { reduceChatItems, type ChatItem, type IdFactory } from "../services/localAgent/chatItem"

function makeIdFactory(): IdFactory {
  let n = 0
  return () => `id-${++n}`
}

describe("reduceChatItems", () => {
  it("ignores system_init and result events", () => {
    const id = makeIdFactory()
    let state: ChatItem[] = []
    state = reduceChatItems(state, { type: "system_init", sessionId: "s", cwd: "/" }, id)
    state = reduceChatItems(state, { type: "result", sessionId: "s", isError: false }, id)
    expect(state).toEqual([])
  })

  it("appends assistant_text events into a single assistant item", () => {
    const id = makeIdFactory()
    let state: ChatItem[] = []
    state = reduceChatItems(state, { type: "assistant_text", text: "Hello " }, id)
    state = reduceChatItems(state, { type: "assistant_text", text: "world" }, id)
    expect(state).toEqual([{ kind: "assistant", id: "id-1", text: "Hello world" }])
  })

  it("starts a new assistant item if a tool_use breaks the streak", () => {
    const id = makeIdFactory()
    let state: ChatItem[] = []
    state = reduceChatItems(state, { type: "assistant_text", text: "Reading" }, id)
    state = reduceChatItems(state, { type: "tool_use", id: "tu1", name: "Read", input: { file_path: "x" } }, id)
    state = reduceChatItems(state, { type: "assistant_text", text: "Done" }, id)
    expect(state.map((i) => i.kind)).toEqual(["assistant", "tool", "assistant"])
  })

  it("attaches tool_result to its matching tool item", () => {
    const id = makeIdFactory()
    let state: ChatItem[] = []
    state = reduceChatItems(state, { type: "tool_use", id: "tu1", name: "Read", input: {} }, id)
    state = reduceChatItems(
      state,
      { type: "tool_result", toolUseId: "tu1", isError: false, content: "file contents" },
      id
    )
    const tool = state[0]
    expect(tool.kind).toBe("tool")
    if (tool.kind === "tool") {
      expect(tool.result).toEqual({ content: "file contents", isError: false })
    }
  })

  it("leaves state unchanged when tool_result has no matching tool_use", () => {
    const id = makeIdFactory()
    const state = reduceChatItems([], { type: "tool_result", toolUseId: "missing", isError: false, content: "x" }, id)
    expect(state).toEqual([])
  })

  it("appends error events as system items flagged isError", () => {
    const id = makeIdFactory()
    const state = reduceChatItems([], { type: "error", message: "boom" }, id)
    expect(state).toEqual([{ kind: "system", id: "id-1", text: "boom", isError: true }])
  })
})
