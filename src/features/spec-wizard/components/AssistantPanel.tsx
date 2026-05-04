"use client"

import { useEffect, useRef, useState } from "react"
import { useLocalAgent } from "../hooks/useLocalAgent"
import { useI18n } from "../i18n/I18nContext"
import { subscribeAssistant } from "../services/localAgent/assistantBridge"
import type { ChatItem } from "../services/localAgent/chatItem"

const COLLAPSED_KEY = "vector-wizard:assistant-collapsed"

export function AssistantPanel() {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [draft, setDraft] = useState("")
  const { messages, isRunning, send, abort, clear } = useLocalAgent()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0")
  }, [collapsed])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    return subscribeAssistant((prompt) => {
      setCollapsed(false)
      void send(prompt)
    })
  }, [send])

  if (collapsed) {
    return (
      <button
        type="button"
        className="assistant-toggle"
        onClick={() => setCollapsed(false)}
        aria-label={t("assistant.expand")}
      >
        ✦ {t("assistant.expand")}
      </button>
    )
  }

  const trimmed = draft.trim()
  const canSend = !isRunning && trimmed.length > 0

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    void send(draft)
    setDraft("")
  }

  return (
    <aside className="assistant-panel" aria-label={t("assistant.title")}>
      <header className="assistant-panel__header">
        <h2>{t("assistant.title")}</h2>
        <div className="assistant-panel__header-actions">
          <button type="button" onClick={clear} disabled={isRunning || messages.length === 0}>
            {t("assistant.clear")}
          </button>
          <button type="button" onClick={() => setCollapsed(true)}>
            {t("assistant.collapse")}
          </button>
        </div>
      </header>

      <p className="assistant-panel__warning">{t("assistant.warning")}</p>

      <div className="assistant-panel__messages" ref={listRef}>
        {messages.length === 0 ? (
          <p className="assistant-panel__empty">{t("assistant.empty")}</p>
        ) : (
          messages.map((item) => <ChatItemView key={item.id} item={item} />)
        )}
      </div>

      <form className="assistant-panel__form" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("assistant.placeholder")}
          rows={3}
          disabled={isRunning}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              if (canSend) {
                void send(draft)
                setDraft("")
              }
            }
          }}
        />
        <div className="assistant-panel__actions">
          {isRunning ? (
            <button type="button" onClick={abort}>
              {t("assistant.abort")}
            </button>
          ) : (
            <button type="submit" disabled={!canSend}>
              {t("assistant.send")}
            </button>
          )}
        </div>
      </form>
    </aside>
  )
}

function ChatItemView({ item }: { item: ChatItem }) {
  const { t } = useI18n()
  switch (item.kind) {
    case "user":
      return (
        <div className="chat-item chat-item--user">
          <span className="chat-item__role">{t("assistant.you")}</span>
          <p>{item.text}</p>
        </div>
      )
    case "assistant":
      return (
        <div className="chat-item chat-item--assistant">
          <span className="chat-item__role">{t("assistant.agent")}</span>
          <p>{item.text}</p>
        </div>
      )
    case "tool":
      return (
        <div className="chat-item chat-item--tool">
          <div className="chat-item__tool-head">
            <span aria-hidden="true">{toolIcon(item.name)}</span> <strong>{item.name}</strong>
          </div>
          <details className="chat-item__tool-input">
            <summary>{t("assistant.toolInputHidden")}</summary>
            <pre>{formatJson(item.input)}</pre>
          </details>
          {item.result ? (
            <details className="chat-item__tool-result" data-error={item.result.isError ? "true" : undefined}>
              <summary>{item.result.isError ? t("assistant.toolError") : t("assistant.toolResult")}</summary>
              <pre>{item.result.content}</pre>
            </details>
          ) : null}
        </div>
      )
    case "system":
      return (
        <div className="chat-item chat-item--system" data-error={item.isError ? "true" : undefined}>
          <p>{item.text}</p>
        </div>
      )
  }
}

function toolIcon(name: string): string {
  if (name === "Read" || name === "Glob" || name === "Grep") return "📖"
  if (name === "Write" || name === "Edit" || name === "MultiEdit") return "✏️"
  if (name === "Bash" || name === "BashOutput") return "⚙️"
  if (name === "WebFetch" || name === "WebSearch") return "🌐"
  return "🔧"
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
