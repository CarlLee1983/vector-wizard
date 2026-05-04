import type { AgentEvent } from "./types"

export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string }
  | {
      kind: "tool"
      id: string
      toolUseId: string
      name: string
      input: unknown
      result?: { content: string; isError: boolean }
    }
  | { kind: "system"; id: string; text: string; isError?: boolean }

export type IdFactory = () => string

export function reduceChatItems(prev: ChatItem[], event: AgentEvent, nextId: IdFactory): ChatItem[] {
  switch (event.type) {
    case "system_init":
      return prev
    case "assistant_text": {
      const last = prev[prev.length - 1]
      if (last && last.kind === "assistant") {
        return [...prev.slice(0, -1), { ...last, text: last.text + event.text }]
      }
      return [...prev, { kind: "assistant", id: nextId(), text: event.text }]
    }
    case "tool_use":
      return [...prev, { kind: "tool", id: nextId(), toolUseId: event.id, name: event.name, input: event.input }]
    case "tool_result":
      return prev.map((item) => {
        if (item.kind === "tool" && item.toolUseId === event.toolUseId) {
          return { ...item, result: { content: event.content, isError: event.isError } }
        }
        return item
      })
    case "result":
      return prev
    case "error":
      return [...prev, { kind: "system", id: nextId(), text: event.message, isError: true }]
  }
}
