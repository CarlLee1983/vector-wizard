import { describe, expect, it } from "vitest"
import { POST } from "../../../../app/api/generate-spec/route"
import { minimalValidDraft } from "../test/fixtures"

function requestWithBody(body: unknown): Request {
  return new Request("http://localhost/api/generate-spec", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  })
}

describe("POST /api/generate-spec", () => {
  it("returns YAML, summary, and validation for a valid draft", async () => {
    const response = await POST(requestWithBody({ draft: minimalValidDraft(), createdAt: "2026-04-26" }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.yaml).toContain('schemaVersion: "0.1"')
    expect(json.summary).toContain("Login error message improvement")
    expect(json.validation.blockingErrors).toEqual([])
  })

  it("returns blocking errors while still returning preview output", async () => {
    const draft = minimalValidDraft()
    draft.metadata.title = ""

    const response = await POST(requestWithBody({ draft, createdAt: "2026-04-26" }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.validation.blockingErrors[0].code).toBe("missing_title")
    expect(json.yaml).toContain("metadata:")
  })

  it("rejects invalid JSON payload shape", async () => {
    const response = await POST(requestWithBody({ bad: true }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Invalid request: expected a draft object.")
  })
})
