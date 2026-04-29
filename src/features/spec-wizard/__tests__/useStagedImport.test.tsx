import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useStagedImport } from "../hooks/useStagedImport"
import { __resetForTests } from "../persistence/draftStore"
import { useDraftStore } from "../hooks/useDraftStore"

beforeEach(() => {
  __resetForTests()
  localStorage.clear()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetchOnce(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  const response = new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" }
  })
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response)
}

const validDraft = {
  metadata: { title: "FT-001", locale: "zh-TW" },
  summary: {},
  goal: { statement: "x", successSignals: [] },
  impacts: [],
  deliverables: [],
  userActivities: [],
  epics: [
    {
      id: "EP-001",
      title: "e",
      stories: [{ id: "US-001", title: "s", userStory: "u", acceptanceCriteria: [], examples: [] }]
    }
  ],
  agentBoundaries: { nonGoals: [], constraints: [], testExpectations: [], risks: [], openQuestions: [] }
}

describe("useStagedImport", () => {
  it("stays idle when staging returns no drafts", async () => {
    mockFetchOnce({ drafts: [] })
    const { result } = renderHook(() => useStagedImport())
    await waitFor(() => expect(result.current.status).toBe("idle"))
    expect(result.current.imported).toBe(0)
  })

  it("imports each staged draft and reports success", async () => {
    mockFetchOnce({
      drafts: [
        { sourcePath: "a.json", draft: validDraft },
        { sourcePath: "b.json", draft: validDraft }
      ]
    })

    const { result: store } = renderHook(() => useDraftStore())
    const { result } = renderHook(() => useStagedImport())

    await waitFor(() => expect(result.current.status).toBe("success"))
    expect(result.current.imported).toBe(2)
    expect(result.current.skipped).toBe(0)
    expect(store.current.drafts.length).toBe(2)
  })

  it("reports partial when some drafts fail", async () => {
    mockFetchOnce({
      drafts: [
        { sourcePath: "good.json", draft: validDraft },
        { sourcePath: "bad.json", draft: { not: "a draft" } }
      ]
    })

    const { result } = renderHook(() => useStagedImport())

    await waitFor(() => expect(result.current.status).toBe("partial"))
    expect(result.current.imported).toBe(1)
    expect(result.current.skipped).toBe(1)
  })

  it("reports error when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"))
    const { result } = renderHook(() => useStagedImport())
    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.error).toBe("offline")
  })

  it("only POSTs once even when re-rendered", async () => {
    mockFetchOnce({ drafts: [] })
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const { rerender } = renderHook(() => useStagedImport())
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    rerender()
    rerender()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("dismiss() resets to idle", async () => {
    mockFetchOnce({ drafts: [{ sourcePath: "a.json", draft: validDraft }] })
    const { result } = renderHook(() => useStagedImport())
    await waitFor(() => expect(result.current.status).toBe("success"))
    act(() => result.current.dismiss())
    expect(result.current.status).toBe("idle")
  })
})
