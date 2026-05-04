import { describe, expect, it, vi } from "vitest"
import { handleWizardAction } from "../services/localAgent/wizardActionRouteHandler"
import { minimalValidDraft } from "../test/fixtures"

describe("handleWizardAction", () => {
  it("returns 200 + ActionResult preview for valid input", async () => {
    const fakeRunAction = vi.fn().mockResolvedValue({
      kind: "preview",
      actionId: "stories.rewrite",
      preview: { text: "x", targetPath: "epics[0].stories[0].userStory", mode: "replace" }
    })
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "stories.rewrite", draft: minimalValidDraft() })
    })
    const res = await handleWizardAction(req, { runAction: fakeRunAction, cwd: "/tmp" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe("preview")
    expect(fakeRunAction).toHaveBeenCalledTimes(1)
    expect(fakeRunAction.mock.calls[0][0].cwd).toBe("/tmp")
  })

  it("returns 400 when actionId missing", async () => {
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: minimalValidDraft() })
    })
    const res = await handleWizardAction(req, { runAction: vi.fn() })
    expect(res.status).toBe(400)
  })

  it("returns 400 when draft missing or not an object", async () => {
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "stories.gaps" })
    })
    const res = await handleWizardAction(req, { runAction: vi.fn() })
    expect(res.status).toBe(400)
  })

  it("returns 400 for malformed JSON body", async () => {
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json"
    })
    const res = await handleWizardAction(req, { runAction: vi.fn() })
    expect(res.status).toBe(400)
  })

  it("returns 200 + run_error JSON when runAction returns run_error", async () => {
    const fakeRunAction = vi.fn().mockResolvedValue({
      kind: "run_error",
      actionId: "stories.rewrite",
      message: "spawn failed"
    })
    const req = new Request("http://localhost/api/wizard-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: "stories.rewrite", draft: minimalValidDraft() })
    })
    const res = await handleWizardAction(req, { runAction: fakeRunAction })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe("run_error")
  })
})
