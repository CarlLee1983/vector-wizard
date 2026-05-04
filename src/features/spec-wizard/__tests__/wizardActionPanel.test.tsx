import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WizardActionPanel } from "../components/WizardActionPanel"
import { WizardContextProvider } from "../hooks/useWizardContext"
import { I18nProvider } from "../i18n/I18nContext"
import { minimalValidDraft } from "../test/fixtures"
import { __resetForTests } from "../persistence/draftStore"
import type { ReactNode } from "react"

function setupFetch(returnValue: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => returnValue
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function harness(node: ReactNode) {
  return (
    <I18nProvider initialLocale="zh-TW">
      <WizardContextProvider currentStepId="stories" activeDraft={minimalValidDraft()}>
        {node}
      </WizardContextProvider>
    </I18nProvider>
  )
}

describe("WizardActionPanel", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    __resetForTests()
  })

  it("renders header + action menu for current step", () => {
    setupFetch({})
    render(harness(<WizardActionPanel />))
    expect(screen.getByText(/AI 助手|AI Assistant/i)).toBeInTheDocument()
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(3)
  })

  it("calls /api/wizard-action on action click and pushes a card", async () => {
    const fetchMock = setupFetch({
      kind: "preview",
      actionId: "stories.rewrite",
      preview: {
        text: "rewritten",
        targetPath: "epics[0].stories[0].userStory",
        mode: "replace"
      }
    })
    render(harness(<WizardActionPanel />))
    const buttons = screen.getAllByRole("button")
    const rewriteBtn = buttons.find((b) => /改寫|rewrite/i.test(b.textContent ?? ""))
    if (!rewriteBtn) throw new Error("rewrite button not found")
    fireEvent.click(rewriteBtn)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/wizard-action")
    expect(init.method).toBe("POST")
    const body = JSON.parse(init.body)
    expect(body.actionId).toBe("stories.rewrite")
    await waitFor(() => expect(screen.getByText("rewritten")).toBeInTheDocument())
  })

  it("caps result stack at 5 cards (oldest dropped)", async () => {
    const fetchMock = setupFetch({
      kind: "notes",
      actionId: "stories.gaps",
      notes: [{ severity: "info", text: "ok" }]
    })
    render(harness(<WizardActionPanel />))
    const buttons = screen.getAllByRole("button")
    const gapsBtn = buttons.find((b) => /缺|gap|missing/i.test(b.textContent ?? ""))
    if (!gapsBtn) throw new Error("gaps button not found")
    for (let i = 0; i < 6; i++) {
      fireEvent.click(gapsBtn)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(i + 1))
    }
    const cards = document.querySelectorAll(".action-card")
    expect(cards.length).toBe(5)
  })
})
