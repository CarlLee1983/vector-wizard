import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ActionResultCard } from "../components/ActionResultCard"
import { I18nProvider } from "../i18n/I18nContext"
import type { ActionResult } from "../services/localAgent/actionResult"
import type { ReactNode } from "react"

function withI18n(node: ReactNode) {
  return <I18nProvider initialLocale="zh-TW">{node}</I18nProvider>
}

describe.skip("ActionResultCard", () => {
  it("renders preview card with adopt and discard buttons", () => {
    const result: ActionResult = {
      kind: "preview",
      actionId: "stories.rewrite",
      preview: { text: "new story", targetPath: "epics[0].stories[0].userStory", mode: "replace" }
    }
    const onAdopt = vi.fn()
    const onDiscard = vi.fn()
    render(withI18n(<ActionResultCard result={result} onAdopt={onAdopt} onDiscard={onDiscard} />))
    expect(screen.getByText("new story")).toBeInTheDocument()
    expect(screen.getByText("epics[0].stories[0].userStory")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /採用|adopt/i }))
    expect(onAdopt).toHaveBeenCalledWith(result)
  })

  it("renders notes card with bullet list and dismiss only", () => {
    const result: ActionResult = {
      kind: "notes",
      actionId: "stories.gaps",
      notes: [
        { severity: "warning", text: "Missing admin role" },
        { severity: "info", text: "Edge case ok" }
      ]
    }
    render(withI18n(<ActionResultCard result={result} onAdopt={() => {}} onDiscard={() => {}} />))
    expect(screen.getByText(/Missing admin role/)).toBeInTheDocument()
    expect(screen.getByText(/Edge case ok/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /採用|adopt/i })).toBeNull()
  })

  it("renders parse_error with raw text and retry button", () => {
    const result: ActionResult = {
      kind: "parse_error",
      actionId: "stories.rewrite",
      raw: "free-form claude reply"
    }
    const onRetry = vi.fn()
    render(
      withI18n(
        <ActionResultCard result={result} onAdopt={() => {}} onDiscard={() => {}} onRetry={onRetry} />
      )
    )
    expect(screen.getByText(/free-form claude reply/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /重試|retry/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it("renders run_error with message", () => {
    const result: ActionResult = {
      kind: "run_error",
      actionId: "stories.rewrite",
      message: "spawn EACCES"
    }
    render(withI18n(<ActionResultCard result={result} onAdopt={() => {}} onDiscard={() => {}} />))
    expect(screen.getByText(/spawn EACCES/)).toBeInTheDocument()
  })
})
