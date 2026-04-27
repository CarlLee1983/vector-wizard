import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { EmptyDraftState } from "../components/EmptyDraftState"
import { I18nProvider } from "../i18n/I18nContext"
import { __resetForTests, getSnapshot } from "../persistence/draftStore"

describe("EmptyDraftState", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("renders welcome copy and creates a draft on CTA click", () => {
    render(
      <I18nProvider>
        <EmptyDraftState />
      </I18nProvider>
    )

    expect(screen.getByText("歡迎")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /新增/ }))
    expect(getSnapshot().activeDraftId).not.toBeNull()
  })
})
