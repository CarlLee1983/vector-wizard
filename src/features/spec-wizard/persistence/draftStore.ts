import { createEmptyDraft } from "../model/defaultDraft"
import type { DraftStoreState, FeatureDraft, Locale } from "../model/specTypes"
import { draftFromJson, draftToJson } from "./draftStorage"

const STORAGE_KEY = "vector.draftStore.v1"
const V1_KEY = "vector.featureDraft.v1"

let state: DraftStoreState | null = null
let lastWriteError: Error | null = null
const subscribers = new Set<() => void>()

function emptyState(): DraftStoreState {
  return { version: 1, activeDraftId: null, drafts: {}, meta: {} }
}

export function generateDraftId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function backupCorrupt(key: string): void {
  if (typeof localStorage === "undefined") return
  const raw = localStorage.getItem(key)
  if (raw == null) return
  localStorage.setItem(`${key}.corrupt-${Date.now()}`, raw)
  localStorage.removeItem(key)
}

function isDraftStoreState(x: unknown): x is DraftStoreState {
  if (x == null || typeof x !== "object") return false
  const o = x as Record<string, unknown>
  return (
    o.version === 1 &&
    (o.activeDraftId === null || typeof o.activeDraftId === "string") &&
    typeof o.drafts === "object" &&
    o.drafts !== null &&
    typeof o.meta === "object" &&
    o.meta !== null
  )
}

function normalizeActiveDraft(next: DraftStoreState): DraftStoreState {
  if (next.activeDraftId == null || next.drafts[next.activeDraftId]) return next
  const remainingIds = Object.keys(next.drafts)
  return { ...next, activeDraftId: remainingIds[0] ?? null }
}

function persist(next: DraftStoreState): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    lastWriteError = null
  } catch (err) {
    lastWriteError = err instanceof Error ? err : new Error(String(err))
  }
}

function migrateFromV1(): DraftStoreState | null {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(V1_KEY)
  if (raw == null) return null
  try {
    const parsed = JSON.parse(raw) as { metadata?: unknown; goal?: unknown }
    if (!parsed || typeof parsed !== "object" || !parsed.metadata || !parsed.goal) {
      throw new Error("invalid v1 draft")
    }
    const id = generateDraftId()
    const now = Date.now()
    const next: DraftStoreState = {
      version: 1,
      activeDraftId: id,
      drafts: { [id]: parsed as DraftStoreState["drafts"][string] },
      meta: { [id]: { createdAt: now, updatedAt: now } }
    }
    localStorage.removeItem(V1_KEY)
    return next
  } catch {
    backupCorrupt(V1_KEY)
    return null
  }
}

function hydrate(): DraftStoreState {
  if (typeof localStorage === "undefined") return emptyState()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw != null) {
    try {
      const parsed = JSON.parse(raw)
      if (isDraftStoreState(parsed)) return normalizeActiveDraft(parsed)
      throw new Error("invalid v2 shape")
    } catch {
      backupCorrupt(STORAGE_KEY)
      return emptyState()
    }
  }
  const migrated = migrateFromV1()
  if (migrated != null) {
    persist(migrated)
    return migrated
  }
  return emptyState()
}

function ensureHydrated(): DraftStoreState {
  if (state == null) state = hydrate()
  return state
}

function notify(): void {
  subscribers.forEach((cb) => cb())
}

function setStateAndNotify(next: DraftStoreState): void {
  state = next
  persist(next)
  notify()
}

export function getSnapshot(): DraftStoreState {
  return ensureHydrated()
}

export function getServerSnapshot(): DraftStoreState {
  return emptyState()
}

export function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

export function getLastWriteError(): Error | null {
  return lastWriteError
}

export function createDraft(locale: Locale = "zh-TW"): string {
  const current = ensureHydrated()
  const id = generateDraftId()
  const now = Date.now()
  const next: DraftStoreState = {
    ...current,
    activeDraftId: id,
    drafts: { ...current.drafts, [id]: createEmptyDraft(locale) },
    meta: { ...current.meta, [id]: { createdAt: now, updatedAt: now } }
  }
  setStateAndNotify(next)
  return id
}

export function selectDraft(id: string): void {
  const current = ensureHydrated()
  if (!current.drafts[id]) return
  if (current.activeDraftId === id) return
  setStateAndNotify({ ...current, activeDraftId: id })
}

export function setActiveDraft(draft: FeatureDraft): void {
  const current = ensureHydrated()
  const id = current.activeDraftId
  if (id == null || !current.drafts[id]) return
  const now = Date.now()
  setStateAndNotify({
    ...current,
    drafts: { ...current.drafts, [id]: draft },
    meta: { ...current.meta, [id]: { ...current.meta[id], updatedAt: now } }
  })
}

export function renameDraft(id: string, title: string): void {
  const current = ensureHydrated()
  const target = current.drafts[id]
  if (!target) return
  const now = Date.now()
  const nextDraft: FeatureDraft = {
    ...target,
    metadata: { ...target.metadata, title }
  }
  setStateAndNotify({
    ...current,
    drafts: { ...current.drafts, [id]: nextDraft },
    meta: { ...current.meta, [id]: { ...current.meta[id], updatedAt: now } }
  })
}

export function deleteDraft(id: string): void {
  const current = ensureHydrated()
  if (!current.drafts[id]) return
  const { [id]: _droppedDraft, ...remainingDrafts } = current.drafts
  const { [id]: _droppedMeta, ...remainingMeta } = current.meta
  let nextActive = current.activeDraftId
  if (nextActive === id) {
    const remainingIds = Object.keys(remainingDrafts)
    nextActive = remainingIds.length > 0 ? remainingIds[0] : null
  }
  setStateAndNotify({
    ...current,
    activeDraftId: nextActive,
    drafts: remainingDrafts,
    meta: remainingMeta
  })
}

export function importDraftJson(raw: string): string {
  const draft = draftFromJson(raw)
  const current = ensureHydrated()
  const id = generateDraftId()
  const now = Date.now()
  setStateAndNotify({
    ...current,
    activeDraftId: id,
    drafts: { ...current.drafts, [id]: draft },
    meta: { ...current.meta, [id]: { createdAt: now, updatedAt: now } }
  })
  return id
}

export function exportDraftJson(id: string): string {
  const current = ensureHydrated()
  const draft = current.drafts[id]
  if (!draft) throw new Error(`No draft with id: ${id}`)
  return draftToJson(draft)
}

export function __resetForTests(): void {
  state = null
  lastWriteError = null
  subscribers.clear()
}
