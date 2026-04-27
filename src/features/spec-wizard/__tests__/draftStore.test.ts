import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FeatureDraft } from "../model/specTypes"
import {
  __resetForTests,
  createDraft,
  deleteDraft,
  exportDraftJson,
  generateDraftId,
  getSnapshot,
  importDraftJson,
  renameDraft,
  selectDraft,
  setActiveDraft,
  subscribe
} from "../persistence/draftStore"
import { minimalValidDraft } from "../test/fixtures"

describe("draftStore — bootstrap", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("returns an empty state when storage is empty", () => {
    const snapshot = getSnapshot()

    expect(snapshot).toEqual({
      version: 1,
      activeDraftId: null,
      drafts: {},
      meta: {}
    })
  })

  it("returns the same reference on repeated calls without mutations", () => {
    const a = getSnapshot()
    const b = getSnapshot()
    expect(a).toBe(b)
  })
})

describe("draftStore — generateDraftId", () => {
  it("produces unique non-empty strings", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) ids.add(generateDraftId())
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id.length).toBeGreaterThan(0)
  })
})

describe("draftStore — mutators", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("creates an empty draft, sets it active, returns its id", () => {
    const id = createDraft()
    const snap = getSnapshot()

    expect(snap.activeDraftId).toBe(id)
    expect(snap.drafts[id]).toBeDefined()
    expect(snap.drafts[id].metadata.title).toBe("")
    expect(snap.meta[id].createdAt).toBe(snap.meta[id].updatedAt)
  })

  it("setActiveDraft replaces the active draft and bumps updatedAt", async () => {
    const id = createDraft()
    const before = getSnapshot().meta[id].updatedAt
    await new Promise((r) => setTimeout(r, 5))

    const next: FeatureDraft = {
      ...getSnapshot().drafts[id],
      metadata: { ...getSnapshot().drafts[id].metadata, title: "進貨單" }
    }
    setActiveDraft(next)

    const after = getSnapshot()
    expect(after.drafts[id].metadata.title).toBe("進貨單")
    expect(after.meta[id].updatedAt).toBeGreaterThan(before)
  })

  it("setActiveDraft is a no-op when there is no active draft", () => {
    const before = getSnapshot()
    const fake = { metadata: { title: "x", locale: "zh-TW" } } as unknown as FeatureDraft
    setActiveDraft(fake)
    expect(getSnapshot()).toBe(before)
  })

  it("renameDraft updates metadata.title without changing active", () => {
    const a = createDraft()
    const b = createDraft()
    expect(getSnapshot().activeDraftId).toBe(b)

    renameDraft(a, "舊草稿")

    const snap = getSnapshot()
    expect(snap.drafts[a].metadata.title).toBe("舊草稿")
    expect(snap.activeDraftId).toBe(b)
  })

  it("selectDraft switches active without mutating drafts", () => {
    const a = createDraft()
    createDraft()
    selectDraft(a)
    expect(getSnapshot().activeDraftId).toBe(a)
  })

  it("deleteDraft removes a non-active draft and keeps active untouched", () => {
    const a = createDraft()
    const b = createDraft()
    deleteDraft(a)
    const snap = getSnapshot()
    expect(snap.drafts[a]).toBeUndefined()
    expect(snap.meta[a]).toBeUndefined()
    expect(snap.activeDraftId).toBe(b)
  })

  it("deleteDraft falls back active to first remaining (insertion order)", () => {
    const a = createDraft()
    createDraft()
    const c = createDraft()
    deleteDraft(c)
    expect(getSnapshot().activeDraftId).toBe(a)
  })

  it("deleting the last draft sets activeDraftId to null", () => {
    const a = createDraft()
    deleteDraft(a)
    const snap = getSnapshot()
    expect(snap.activeDraftId).toBeNull()
    expect(snap.drafts).toEqual({})
  })

  it("persists every mutation to localStorage", () => {
    const id = createDraft()
    const raw = localStorage.getItem("vector.draftStore.v1")
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw as string)
    expect(parsed.activeDraftId).toBe(id)
  })

  it("notifies subscribers on every mutation", () => {
    const cb = vi.fn()
    const unsubscribe = subscribe(cb)
    createDraft()
    expect(cb).toHaveBeenCalledTimes(1)
    setActiveDraft(getSnapshot().drafts[getSnapshot().activeDraftId!])
    expect(cb).toHaveBeenCalledTimes(2)
    unsubscribe()
  })
})

describe("draftStore — JSON import/export", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("imports a valid JSON, creates new id, sets active", () => {
    const draft = minimalValidDraft()
    const id = importDraftJson(JSON.stringify(draft))

    const snap = getSnapshot()
    expect(snap.activeDraftId).toBe(id)
    expect(snap.drafts[id]).toEqual(draft)
  })

  it("preserves prior drafts on import (does not overwrite)", () => {
    const a = createDraft()
    const draft = minimalValidDraft()
    const b = importDraftJson(JSON.stringify(draft))

    const snap = getSnapshot()
    expect(snap.drafts[a]).toBeDefined()
    expect(snap.drafts[b]).toBeDefined()
    expect(snap.activeDraftId).toBe(b)
  })

  it("throws on invalid JSON without mutating state", () => {
    const a = createDraft()
    const before = getSnapshot()

    expect(() => importDraftJson("{not-json")).toThrow()
    expect(() => importDraftJson(JSON.stringify({ no: "schema" }))).toThrow()

    expect(getSnapshot()).toBe(before)
    expect(getSnapshot().activeDraftId).toBe(a)
  })

  it("exports active draft JSON parseable back to identical draft", () => {
    const draft = minimalValidDraft()
    const id = importDraftJson(JSON.stringify(draft))
    const json = exportDraftJson(id)
    expect(JSON.parse(json)).toEqual(draft)
  })

  it("export of unknown id throws", () => {
    expect(() => exportDraftJson("does-not-exist")).toThrow()
  })
})
