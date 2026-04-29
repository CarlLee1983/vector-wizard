import { useState, type ReactElement } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { I18nProvider } from "../i18n/I18nContext"
import { RaidArray } from "../components/RaidArray"
import type { RaidEntry } from "../model/specTypes"

function renderWithI18n(ui: ReactElement) {
  return render(<I18nProvider initialLocale="en">{ui}</I18nProvider>)
}

describe("RaidArray", () => {
  it("renders existing entries with text, status and (when allowed) mitigation", () => {
    const entries: RaidEntry[] = [
      { id: "R-001", text: "Token edge case", status: "validating", mitigation: "Refresh quietly" }
    ]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={() => undefined} />
    )

    expect(screen.getByDisplayValue("Token edge case")).toBeInTheDocument()
    expect((screen.getByLabelText("Status R-001") as HTMLSelectElement).value).toBe("validating")
    expect(screen.getByDisplayValue("Refresh quietly")).toBeInTheDocument()
  })

  it("does not render mitigation field when allowMitigation is false", () => {
    const entries: RaidEntry[] = [{ id: "Q-001", text: "Who owns it?", status: "open" }]
    renderWithI18n(
      <RaidArray
        label="Open Questions"
        idPrefix="Q"
        allowMitigation={false}
        entries={entries}
        onChange={() => undefined}
      />
    )

    expect(screen.queryByLabelText(/Mitigation/i)).toBeNull()
  })

  it("emits onChange with updated text when user types", async () => {
    const handleChange = vi.fn()
    function Stateful() {
      const [entries, setEntries] = useState<RaidEntry[]>([{ id: "R-001", text: "old", status: "open" }])
      return (
        <RaidArray
          label="Risks"
          idPrefix="R"
          allowMitigation
          entries={entries}
          onChange={(next) => {
            setEntries(next)
            handleChange(next)
          }}
        />
      )
    }
    renderWithI18n(<Stateful />)

    await userEvent.clear(screen.getByDisplayValue("old"))
    await userEvent.type(screen.getByLabelText("Risks 1"), "new text")

    expect(handleChange).toHaveBeenLastCalledWith([{ id: "R-001", text: "new text", status: "open" }])
  })

  it("emits onChange with updated status when user selects a new option", async () => {
    const handleChange = vi.fn()
    const entries: RaidEntry[] = [{ id: "R-001", text: "x", status: "open" }]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={handleChange} />
    )

    await userEvent.selectOptions(screen.getByLabelText("Status R-001"), "validated")

    expect(handleChange).toHaveBeenLastCalledWith([{ id: "R-001", text: "x", status: "validated" }])
  })

  it("appends a new entry with auto-generated id when user clicks add", async () => {
    const handleChange = vi.fn()
    const entries: RaidEntry[] = [{ id: "R-001", text: "first", status: "open" }]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={handleChange} />
    )

    await userEvent.click(screen.getByRole("button", { name: /add/i }))

    expect(handleChange).toHaveBeenLastCalledWith([
      { id: "R-001", text: "first", status: "open" },
      { id: "R-002", text: "", status: "open" }
    ])
  })

  it("removes an entry when user clicks the remove button", async () => {
    const handleChange = vi.fn()
    const entries: RaidEntry[] = [
      { id: "R-001", text: "first", status: "open" },
      { id: "R-002", text: "second", status: "open" }
    ]
    renderWithI18n(
      <RaidArray label="Risks" idPrefix="R" allowMitigation entries={entries} onChange={handleChange} />
    )

    await userEvent.click(screen.getByRole("button", { name: /remove R-002/i }))

    expect(handleChange).toHaveBeenLastCalledWith([{ id: "R-001", text: "first", status: "open" }])
  })
})
