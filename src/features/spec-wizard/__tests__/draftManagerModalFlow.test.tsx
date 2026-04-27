import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DraftManagerModal } from "../components/DraftManagerModal"
import { I18nProvider } from "../i18n/I18nContext"
import { __resetForTests, createDraft, getSnapshot, renameDraft } from "../persistence/draftStore"
import { minimalValidDraft } from "../test/fixtures"

function renderModal(onClose = vi.fn()) {
  return render(
    <I18nProvider>
      <DraftManagerModal open={true} onClose={onClose} />
    </I18nProvider>
  )
}

describe("DraftManagerModal", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("renders one row per draft with title and actions", () => {
    const a = createDraft()
    renameDraft(a, "進貨單")
    createDraft()
    renderModal()

    expect(screen.getByDisplayValue("進貨單")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^刪除$/ })).toHaveLength(2)
  })

  it("renames a draft on input blur", () => {
    const a = createDraft()
    renderModal()

    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement
    fireEvent.change(input, { target: { value: "改名後" } })
    fireEvent.blur(input)

    expect(getSnapshot().drafts[a].metadata.title).toBe("改名後")
  })

  it("requires confirmation before deleting", () => {
    createDraft()
    renderModal()

    fireEvent.click(screen.getByRole("button", { name: /^刪除$/ }))
    fireEvent.click(screen.getByRole("button", { name: /取消/ }))
    expect(Object.keys(getSnapshot().drafts)).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: /^刪除$/ }))
    fireEvent.click(screen.getByRole("button", { name: /^確定$/ }))
    expect(Object.keys(getSnapshot().drafts)).toHaveLength(0)
  })

  it("imports a JSON file via the file input", async () => {
    renderModal()
    const file = new File([JSON.stringify(minimalValidDraft())], "draft.json", { type: "application/json" })
    const input = screen.getByLabelText(/匯入 JSON/) as HTMLInputElement
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
    await new Promise((r) => setTimeout(r, 0))
    expect(Object.keys(getSnapshot().drafts).length).toBeGreaterThanOrEqual(1)
  })

  it("shows error toast on invalid import", async () => {
    renderModal()
    const file = new File(["{not-json"], "bad.json", { type: "application/json" })
    const input = screen.getByLabelText(/匯入 JSON/) as HTMLInputElement
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
    expect(await screen.findByText(/匯入失敗/)).toBeInTheDocument()
  })
})
