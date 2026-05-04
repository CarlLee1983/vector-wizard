"use client"

import { useCallback, useRef, useState } from "react"
import { reduceChatItems, type ChatItem, type IdFactory } from "../services/localAgent/chatItem"
import type { AgentEvent } from "../services/localAgent/types"

function defaultIdFactory(): IdFactory {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return () => crypto.randomUUID()
  }
  let n = 0
  return () => `chat-${Date.now()}-${++n}`
}

export type UseLocalAgentResult = {
  messages: ChatItem[]
  isRunning: boolean
  send: (prompt: string) => Promise<void>
  abort: () => void
  clear: () => void
}

export type UseLocalAgentOptions = {
  endpoint?: string
  fetcher?: typeof fetch
  idFactory?: IdFactory
}

function extractErrorMessage(rawText: string, status: number): string {
  if (!rawText) return `HTTP ${status}`
  try {
    const parsed = JSON.parse(rawText) as { error?: unknown }
    if (typeof parsed.error === "string" && parsed.error) return parsed.error
  } catch {
    // not JSON — fall through
  }
  return rawText
}

export function useLocalAgent(opts: UseLocalAgentOptions = {}): UseLocalAgentResult {
  const endpoint = opts.endpoint ?? "/api/agent"
  const fetcherRef = useRef<typeof fetch>(opts.fetcher ?? ((...args) => fetch(...args)))
  const nextIdRef = useRef<IdFactory>(opts.idFactory ?? defaultIdFactory())

  const [messages, setMessages] = useState<ChatItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const runningRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (rawPrompt: string) => {
      if (runningRef.current) return
      const prompt = rawPrompt.trim()
      if (!prompt) return

      const nextId = nextIdRef.current
      runningRef.current = true
      setIsRunning(true)
      setMessages((prev) => [...prev, { kind: "user", id: nextId(), text: prompt }])

      const ac = new AbortController()
      abortRef.current = ac

      try {
        const res = await fetcherRef.current(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: ac.signal
        })

        if (!res.ok || !res.body) {
          const rawText = await res.text().catch(() => "")
          const message = extractErrorMessage(rawText, res.status)
          setMessages((prev) => [...prev, { kind: "system", id: nextId(), text: message, isError: true }])
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split("\n\n")
          buffer = parts.pop() ?? ""
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue
            let event: AgentEvent
            try {
              event = JSON.parse(part.slice(6)) as AgentEvent
            } catch {
              continue
            }
            setMessages((prev) => reduceChatItems(prev, event, nextId))
          }
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err)
          setMessages((prev) => [...prev, { kind: "system", id: nextId(), text: message, isError: true }])
        }
      } finally {
        runningRef.current = false
        setIsRunning(false)
        abortRef.current = null
      }
    },
    [endpoint]
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clear = useCallback(() => {
    if (runningRef.current) return
    setMessages([])
  }, [])

  return { messages, isRunning, send, abort, clear }
}
