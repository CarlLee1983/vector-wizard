import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { __resetForTests, getSnapshot } from "../persistence/draftStore"
import { minimalValidDraft } from "../test/fixtures"

const V1_KEY = "vector.featureDraft.v1"
const V2_KEY = "vector.draftStore.v1"

describe("draftStore — migration & corruption", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("migrates v1 single draft into v2 store and removes v1 key", () => {
    const draft = minimalValidDraft()
    localStorage.setItem(V1_KEY, JSON.stringify(draft))

    const snapshot = getSnapshot()

    expect(snapshot.activeDraftId).not.toBeNull()
    const id = snapshot.activeDraftId as string
    expect(snapshot.drafts[id]).toEqual(draft)
    expect(snapshot.meta[id].createdAt).toBeTypeOf("number")
    expect(localStorage.getItem(V1_KEY)).toBeNull()
    expect(localStorage.getItem(V2_KEY)).not.toBeNull()
  })

  it("ignores v1 when v2 already exists", () => {
    const v2State = {
      version: 1,
      activeDraftId: "existing",
      drafts: { existing: minimalValidDraft() },
      meta: { existing: { createdAt: 1, updatedAt: 1 } }
    }
    localStorage.setItem(V2_KEY, JSON.stringify(v2State))
    localStorage.setItem(V1_KEY, JSON.stringify({ should: "be ignored" }))

    const snapshot = getSnapshot()

    expect(snapshot.activeDraftId).toBe("existing")
    expect(localStorage.getItem(V1_KEY)).not.toBeNull()
  })

  it("backs up corrupt v2 storage and starts empty without migrating v1", () => {
    localStorage.setItem(V2_KEY, "{not-valid-json")
    localStorage.setItem(V1_KEY, JSON.stringify(minimalValidDraft()))

    const snapshot = getSnapshot()

    expect(snapshot).toEqual({
      version: 1,
      activeDraftId: null,
      drafts: {},
      meta: {}
    })
    const backupKey = Object.keys(localStorage).find((k) => k.startsWith(`${V2_KEY}.corrupt-`))
    expect(backupKey).toBeDefined()
    expect(localStorage.getItem(V2_KEY)).toBeNull()
    expect(localStorage.getItem(V1_KEY)).not.toBeNull()
  })

  it("backs up corrupt v1 storage when v2 is absent", () => {
    localStorage.setItem(V1_KEY, "{not-json")

    const snapshot = getSnapshot()

    expect(snapshot.activeDraftId).toBeNull()
    const backupKey = Object.keys(localStorage).find((k) => k.startsWith(`${V1_KEY}.corrupt-`))
    expect(backupKey).toBeDefined()
    expect(localStorage.getItem(V1_KEY)).toBeNull()
  })
})
