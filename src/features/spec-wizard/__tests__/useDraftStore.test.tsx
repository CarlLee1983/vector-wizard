import { act, render, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useDraftStore } from "../hooks/useDraftStore"
import { __resetForTests } from "../persistence/draftStore"
import { draftToYaml } from "../services/yamlSerializer"
import { minimalValidDraft } from "../test/fixtures"

function Probe() {
  const { activeDraftId, drafts, createDraft } = useDraftStore()
  return (
    <div>
      <span data-testid="active">{activeDraftId ?? "none"}</span>
      <span data-testid="count">{drafts.length}</span>
      <button onClick={() => createDraft()}>create</button>
    </div>
  )
}

describe("useDraftStore", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("starts with empty store and re-renders after createDraft", () => {
    render(<Probe />)
    expect(screen.getByTestId("active").textContent).toBe("none")
    expect(screen.getByTestId("count").textContent).toBe("0")

    act(() => {
      screen.getByText("create").click()
    })

    expect(screen.getByTestId("active").textContent).not.toBe("none")
    expect(screen.getByTestId("count").textContent).toBe("1")
  })

  it("exposes importDraftYaml that creates a draft from YAML", () => {
    const { result } = renderHook(() => useDraftStore())
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    let newId = ""
    act(() => {
      newId = result.current.importDraftYaml(yaml)
    })
    expect(result.current.drafts.find((d) => d.id === newId)?.draft.metadata.title).toBe(
      "Login error message improvement"
    )
  })
})
