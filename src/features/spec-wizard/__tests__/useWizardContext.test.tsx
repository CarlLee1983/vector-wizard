import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { WizardContextProvider, useWizardContext } from "../hooks/useWizardContext"
import type { ActionStepId } from "../services/localAgent/actionRegistry"
import { minimalValidDraft } from "../test/fixtures"

function Probe() {
  const ctx = useWizardContext()
  return <div data-testid="probe">{ctx.currentStepId}</div>
}

describe("useWizardContext", () => {
  it("exposes currentStepId provided by provider", () => {
    const draft = minimalValidDraft()
    render(
      <WizardContextProvider currentStepId={"stories" as ActionStepId} activeDraft={draft}>
        <Probe />
      </WizardContextProvider>
    )
    expect(screen.getByTestId("probe").textContent).toBe("stories")
  })

  it("throws when used outside provider", () => {
    const orig = console.error
    console.error = () => {}
    try {
      expect(() => render(<Probe />)).toThrow(/WizardContextProvider/)
    } finally {
      console.error = orig
    }
  })
})
