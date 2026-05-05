import { describe, expect, it, vi } from "vitest"
import { handleDraftRequest } from "../services/localAgent/draftRequestRouteHandler"

describe("handleDraftRequest", () => {
  it("returns 200 with kind=draft when generator succeeds", async () => {
    const fakeGenerate = vi.fn().mockResolvedValue({
      kind: "draft",
      draft: { metadata: { title: "Onboarding revamp" } }
    })
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Onboarding revamp", owner: "Annie", locale: "zh-TW" })
    })
    const res = await handleDraftRequest(req, { generateDraft: fakeGenerate, cwd: "/tmp" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe("draft")
    expect(fakeGenerate).toHaveBeenCalledTimes(1)
    expect(fakeGenerate.mock.calls[0][0].cwd).toBe("/tmp")
    expect(fakeGenerate.mock.calls[0][0].title).toBe("Onboarding revamp")
    expect(fakeGenerate.mock.calls[0][0].locale).toBe("zh-TW")
  })

  it("returns 200 with kind=parse_error when generator returns parse_error", async () => {
    const fakeGenerate = vi.fn().mockResolvedValue({ kind: "parse_error", raw: "garbage" })
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X", locale: "en" })
    })
    const res = await handleDraftRequest(req, { generateDraft: fakeGenerate })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe("parse_error")
  })

  it("returns 200 with kind=run_error when generator returns run_error", async () => {
    const fakeGenerate = vi.fn().mockResolvedValue({ kind: "run_error", message: "spawn failed" })
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X", locale: "en" })
    })
    const res = await handleDraftRequest(req, { generateDraft: fakeGenerate })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kind).toBe("run_error")
  })

  it("returns 400 when title is missing", async () => {
    const fakeGenerate = vi.fn()
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "en" })
    })
    const res = await handleDraftRequest(req, { generateDraft: fakeGenerate })
    expect(res.status).toBe(400)
    expect(fakeGenerate).not.toHaveBeenCalled()
  })

  it("returns 400 when title is empty string", async () => {
    const fakeGenerate = vi.fn()
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   ", locale: "en" })
    })
    const res = await handleDraftRequest(req, { generateDraft: fakeGenerate })
    expect(res.status).toBe(400)
    expect(fakeGenerate).not.toHaveBeenCalled()
  })

  it("returns 400 when locale is invalid", async () => {
    const fakeGenerate = vi.fn()
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X", locale: "fr-FR" })
    })
    const res = await handleDraftRequest(req, { generateDraft: fakeGenerate })
    expect(res.status).toBe(400)
    expect(fakeGenerate).not.toHaveBeenCalled()
  })

  it("returns 400 for malformed JSON body", async () => {
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json"
    })
    const res = await handleDraftRequest(req, { generateDraft: vi.fn() })
    expect(res.status).toBe(400)
  })

  it("forwards request abort signal to generator", async () => {
    const fakeGenerate = vi.fn().mockResolvedValue({ kind: "draft", draft: {} })
    const req = new Request("http://localhost/api/request-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X", locale: "en" })
    })
    await handleDraftRequest(req, { generateDraft: fakeGenerate })
    expect(fakeGenerate.mock.calls[0][0].signal).toBe(req.signal)
  })
})
