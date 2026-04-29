import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../services/stagedImportStore", () => ({
  consumeStagedDrafts: vi.fn()
}))

import { consumeStagedDrafts } from "../services/stagedImportStore"
// 注意：以下 import path 需與 generateSpecRoute.test.ts 對齊
import { POST } from "../../../../app/api/import-staged/route"

const mocked = consumeStagedDrafts as unknown as ReturnType<typeof vi.fn>

afterEach(() => {
  mocked.mockReset()
})

describe("POST /api/import-staged", () => {
  it("returns drafts from consumeStagedDrafts", async () => {
    mocked.mockResolvedValueOnce({
      drafts: [{ sourcePath: "a.json", draft: { metadata: { title: "A" } } }]
    })

    const req = new Request("http://localhost/api/import-staged", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      drafts: [{ sourcePath: "a.json", draft: { metadata: { title: "A" } } }]
    })
    expect(mocked).toHaveBeenCalledWith(process.cwd())
  })

  it("returns empty drafts when nothing is staged", async () => {
    mocked.mockResolvedValueOnce({ drafts: [] })

    const req = new Request("http://localhost/api/import-staged", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ drafts: [] })
  })

  it("returns 500 when consume helper throws", async () => {
    mocked.mockRejectedValueOnce(new Error("boom"))

    const req = new Request("http://localhost/api/import-staged", { method: "POST" })
    const res = await POST(req)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Failed to read staged drafts" })
  })
})
