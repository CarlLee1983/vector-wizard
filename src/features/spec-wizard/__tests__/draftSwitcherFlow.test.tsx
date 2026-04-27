import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DraftSwitcher } from "../components/DraftSwitcher"
import { I18nProvider } from "../i18n/I18nContext"
import { __resetForTests, createDraft, getSnapshot } from "../persistence/draftStore"

function renderSwitcher() {
  return render(
    <I18nProvider>
      <DraftSwitcher onOpenManager={() => {}} />
    </I18nProvider>
  )
}

describe("DraftSwitcher", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("shows untitled placeholder when no active draft has title", () => {
    createDraft()
    renderSwitcher()
    expect(screen.getByText(/未命名草稿/)).toBeInTheDocument()
  })

  it("creates a new draft when '新增' is clicked", () => {
    createDraft()
    renderSwitcher()
    fireEvent.click(screen.getByRole("button", { name: /目前草稿|未命名/ }))
    fireEvent.click(screen.getByRole("button", { name: /新增草稿/ }))
    expect(Object.keys(getSnapshot().drafts)).toHaveLength(2)
  })

  it("switches to a different draft when clicked", () => {
    const a = createDraft()
    const b = createDraft()
    expect(getSnapshot().activeDraftId).toBe(b)
    renderSwitcher()
    fireEvent.click(screen.getByRole("button", { name: /目前草稿|未命名/ }))
    const items = screen.getAllByRole("option")
    fireEvent.click(items[0])
    expect(getSnapshot().activeDraftId).toBe(a)
  })
})
