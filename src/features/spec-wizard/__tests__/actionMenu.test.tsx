import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ActionMenu } from "../components/ActionMenu"
import { I18nProvider } from "../i18n/I18nContext"
import type { ReactNode } from "react"

function withI18n(node: ReactNode) {
  return <I18nProvider initialLocale="zh-TW">{node}</I18nProvider>
}

describe("ActionMenu", () => {
  it("renders 3 buttons for stories step", () => {
    render(withI18n(<ActionMenu step="stories" onRun={() => {}} isRunning={false} />))
    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("calls onRun with the action id when a button is clicked", () => {
    const onRun = vi.fn()
    render(withI18n(<ActionMenu step="stories" onRun={onRun} isRunning={false} />))
    fireEvent.click(screen.getAllByRole("button")[0])
    expect(onRun).toHaveBeenCalledWith(expect.stringMatching(/^stories\./))
  })

  it("disables all buttons when isRunning is true", () => {
    render(withI18n(<ActionMenu step="stories" onRun={() => {}} isRunning={true} />))
    expect(screen.getAllByRole("button").every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it("renders empty state for step with no actions", () => {
    render(withI18n(<ActionMenu step="basic" onRun={() => {}} isRunning={false} />))
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.getByText(/此步驟尚未提供動作|no actions/i)).toBeInTheDocument()
  })
})
