# Multi-Draft Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 spec wizard 從「單一 Feature Draft」擴充為「多份獨立 Draft 管理」，含 Header dropdown 切換、管理 modal、空狀態、自動遷移舊 storage。

**Architecture:** 引入純函式 `draftStore.ts` 集中所有 draft state 與 invariants（active fallback、migration、autosave、corruption backup），透過 `useSyncExternalStore` 暴露給 React。Wizard 從「自家管 state」退化為「store 消費者」，header 抽到 `<AppShell>`。新元件全部小而聚焦（每檔 < 200 行）。

**Tech Stack:** Next.js 14 App Router、React 18 (useSyncExternalStore)、TypeScript、Vitest + jsdom + Testing Library、bun。

**Spec:** `docs/superpowers/specs/2026-04-27-multi-draft-management-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|------|---------------|
| `src/features/spec-wizard/persistence/draftStore.ts` | 純函式 store：state、hydrate、migration、CRUD、import/export、subscriber |
| `src/features/spec-wizard/hooks/useDraftStore.ts` | React hook 包裝 store |
| `src/features/spec-wizard/components/AppShell.tsx` | Header + 主區插槽 + AutosaveErrorToast |
| `src/features/spec-wizard/components/DraftSwitcher.tsx` | Header dropdown |
| `src/features/spec-wizard/components/DraftManagerModal.tsx` | 完整管理：rename / delete / import / export |
| `src/features/spec-wizard/components/EmptyDraftState.tsx` | 0 draft 歡迎畫面 |
| `src/features/spec-wizard/components/LanguageSwitcher.tsx` | 從 Wizard 抽出的語言切換器 |
| `src/features/spec-wizard/components/ConfirmDialog.tsx` | 通用確認對話框 |
| `src/features/spec-wizard/components/AutosaveErrorToast.tsx` | autosave 失敗的 toast |
| `src/features/spec-wizard/__tests__/draftStore.test.ts` | store CRUD + import/export 純函式測試 |
| `src/features/spec-wizard/__tests__/draftStoreMigration.test.ts` | v1 → v2 migration 與 corruption 情境 |
| `src/features/spec-wizard/__tests__/useDraftStore.test.tsx` | hook 訂閱與 SSR snapshot |
| `src/features/spec-wizard/__tests__/draftSwitcherFlow.test.tsx` | dropdown 新增 / 切換流程 |
| `src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx` | modal 改名 / 刪除 / 匯入 / 匯出 |
| `src/features/spec-wizard/__tests__/emptyStateFlow.test.tsx` | 0 draft 顯示與 CTA |

### Modified files

| Path | 變動 |
|------|------|
| `src/features/spec-wizard/model/specTypes.ts` | 新增 `DraftId`、`DraftMetaEntry`、`DraftStoreState` |
| `src/features/spec-wizard/persistence/draftStorage.ts` | 移除 `saveDraft` / `clearDraft`，保留 `loadDraft` / `draftToJson` / `draftFromJson`（store 使用） |
| `src/features/spec-wizard/components/Wizard.tsx` | 移除自家 draft state、autosave、header;改用 `useDraftStore` |
| `src/features/spec-wizard/i18n/dictionaries.ts` | 新增 21 個 i18n key（zh-TW + en） |
| `app/page.tsx` | 主區從 `<Wizard />` 改為 `<AppShell>{...}</AppShell>` |
| `src/features/spec-wizard/__tests__/draftStorage.test.ts` | 改測縮編後的 draftStorage（只剩 JSON helper + V1 read） |
| `src/features/spec-wizard/__tests__/wizardFlow.test.tsx` | 更新初始化方式（透過 store） |

---

## Task 1: 新增 i18n 鍵值

提早做這個，後面所有 UI 元件都會引用。

**Files:**
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`

- [ ] **Step 1: 在 `MessageKey` union 末尾新增 21 個 key**

打開 `src/features/spec-wizard/i18n/dictionaries.ts`，找到 `MessageKey` union 的最後一個 entry，在 `=` ... `|` ... 鏈最末加入：

```ts
  | "draftSwitcher.label"
  | "draftSwitcher.untitled"
  | "draftSwitcher.new"
  | "draftSwitcher.manage"
  | "draftSwitcher.empty"
  | "draftManager.title"
  | "draftManager.import"
  | "draftManager.importError"
  | "draftManager.export"
  | "draftManager.delete"
  | "draftManager.rename"
  | "draftManager.updatedAt"
  | "confirm.deleteDraft.title"
  | "confirm.deleteDraft.message"
  | "confirm.confirm"
  | "confirm.cancel"
  | "empty.title"
  | "empty.subtitle"
  | "empty.cta"
  | "autosave.error"
  | "autosave.dismiss"
```

- [ ] **Step 2: 在 `dictionaries["zh-TW"]` 物件末尾新增對應條目**

```ts
  "draftSwitcher.label": "目前草稿",
  "draftSwitcher.untitled": "未命名草稿",
  "draftSwitcher.new": "+ 新增草稿",
  "draftSwitcher.manage": "⚙ 管理",
  "draftSwitcher.empty": "+ 開始第一個草稿",
  "draftManager.title": "草稿管理",
  "draftManager.import": "匯入 JSON",
  "draftManager.importError": "匯入失敗：JSON 格式不正確",
  "draftManager.export": "匯出 JSON",
  "draftManager.delete": "刪除",
  "draftManager.rename": "重新命名",
  "draftManager.updatedAt": "上次更新",
  "confirm.deleteDraft.title": "確定刪除草稿？",
  "confirm.deleteDraft.message": "確定刪除此草稿？此動作無法還原。",
  "confirm.confirm": "確定",
  "confirm.cancel": "取消",
  "empty.title": "歡迎",
  "empty.subtitle": "開始你的第一個想法",
  "empty.cta": "+ 新增草稿",
  "autosave.error": "自動存檔失敗，請匯出 JSON 備份",
  "autosave.dismiss": "知道了",
```

- [ ] **Step 3: 在 `dictionaries["en"]` 物件末尾新增對應條目**

```ts
  "draftSwitcher.label": "Current draft",
  "draftSwitcher.untitled": "Untitled draft",
  "draftSwitcher.new": "+ New draft",
  "draftSwitcher.manage": "⚙ Manage",
  "draftSwitcher.empty": "+ Start your first draft",
  "draftManager.title": "Manage drafts",
  "draftManager.import": "Import JSON",
  "draftManager.importError": "Import failed: invalid JSON",
  "draftManager.export": "Export JSON",
  "draftManager.delete": "Delete",
  "draftManager.rename": "Rename",
  "draftManager.updatedAt": "Last updated",
  "confirm.deleteDraft.title": "Delete draft?",
  "confirm.deleteDraft.message": "Delete this draft? This cannot be undone.",
  "confirm.confirm": "Confirm",
  "confirm.cancel": "Cancel",
  "empty.title": "Welcome",
  "empty.subtitle": "Start your first idea",
  "empty.cta": "+ New draft",
  "autosave.error": "Autosave failed. Please export JSON as backup.",
  "autosave.dismiss": "Dismiss",
```

- [ ] **Step 4: Type 檢查**

Run: `bunx tsc --noEmit`
Expected: 沒有錯誤（兩個 dictionary 都有完整 key 對應）

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/i18n/dictionaries.ts
git commit -m "feat: [i18n] 新增 multi-draft management UI 鍵值"
```

---

## Task 2: 新增型別

**Files:**
- Modify: `src/features/spec-wizard/model/specTypes.ts`

- [ ] **Step 1: 在 `specTypes.ts` 末尾新增型別**

```ts
export type DraftId = string

export type DraftMetaEntry = {
  createdAt: number
  updatedAt: number
}

export type DraftStoreState = {
  version: 1
  activeDraftId: DraftId | null
  drafts: Record<DraftId, FeatureDraft>
  meta: Record<DraftId, DraftMetaEntry>
}
```

- [ ] **Step 2: Type 檢查**

Run: `bunx tsc --noEmit`
Expected: 沒有錯誤

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/model/specTypes.ts
git commit -m "feat: [model] 新增 DraftStoreState 與相關型別"
```

---

## Task 3: 建立 draftStore — 狀態與訂閱骨架

實作 store 的最低骨架：empty state、subscribe/getSnapshot、persist、ID 產生器、空 storage 情境的 hydrate。Migration 與壞掉處理在 Task 4 加上。

**Files:**
- Create: `src/features/spec-wizard/persistence/draftStore.ts`
- Create: `src/features/spec-wizard/__tests__/draftStore.test.ts`

- [ ] **Step 1: 寫失敗測試 — 初始 hydrate 為空 state**

Create `src/features/spec-wizard/__tests__/draftStore.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { __resetForTests, getSnapshot } from "../persistence/draftStore"

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
```

- [ ] **Step 2: 確認測試失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: FAIL — module `../persistence/draftStore` 找不到。

- [ ] **Step 3: 建立 draftStore.ts 骨架**

Create `src/features/spec-wizard/persistence/draftStore.ts`:

```ts
import type { DraftStoreState } from "../model/specTypes"

const STORAGE_KEY = "vector.draftStore.v1"

let state: DraftStoreState | null = null
let lastWriteError: Error | null = null
const subscribers = new Set<() => void>()

function emptyState(): DraftStoreState {
  return { version: 1, activeDraftId: null, drafts: {}, meta: {} }
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

function hydrate(): DraftStoreState {
  if (typeof localStorage === "undefined") return emptyState()
  return emptyState()
}

function ensureHydrated(): DraftStoreState {
  if (state == null) state = hydrate()
  return state
}

function notify(): void {
  subscribers.forEach((cb) => cb())
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

// Test-only helper
export function __resetForTests(): void {
  state = null
  lastWriteError = null
  subscribers.clear()
}
```

- [ ] **Step 4: 確認測試通過**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: PASS

- [ ] **Step 5: 加 ID 產生器測試**

在 `draftStore.test.ts` 末尾追加：

```ts
import { generateDraftId } from "../persistence/draftStore"

describe("draftStore — generateDraftId", () => {
  it("produces unique non-empty strings", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) ids.add(generateDraftId())
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 6: 確認新測試失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: FAIL — `generateDraftId` 未匯出。

- [ ] **Step 7: 在 draftStore.ts 加上 `generateDraftId`**

在 `emptyState` 之後加：

```ts
export function generateDraftId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
```

- [ ] **Step 8: 確認測試全綠**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStore.ts src/features/spec-wizard/__tests__/draftStore.test.ts
git commit -m "feat: [store] 建立 draftStore 骨架與 ID 產生器"
```

---

## Task 4: draftStore — Migration 與壞 storage 處理

**Files:**
- Modify: `src/features/spec-wizard/persistence/draftStore.ts`
- Create: `src/features/spec-wizard/__tests__/draftStoreMigration.test.ts`

- [ ] **Step 1: 寫 migration 測試**

Create `src/features/spec-wizard/__tests__/draftStoreMigration.test.ts`:

```ts
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
    expect(localStorage.getItem(V1_KEY)).not.toBeNull() // not touched
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
    const backupKey = Object.keys(localStorage).find((k) =>
      k.startsWith(`${V2_KEY}.corrupt-`)
    )
    expect(backupKey).toBeDefined()
    expect(localStorage.getItem(V2_KEY)).toBeNull()
    expect(localStorage.getItem(V1_KEY)).not.toBeNull() // not consumed
  })

  it("backs up corrupt v1 storage when v2 is absent", () => {
    localStorage.setItem(V1_KEY, "{not-json")

    const snapshot = getSnapshot()

    expect(snapshot.activeDraftId).toBeNull()
    const backupKey = Object.keys(localStorage).find((k) =>
      k.startsWith(`${V1_KEY}.corrupt-`)
    )
    expect(backupKey).toBeDefined()
    expect(localStorage.getItem(V1_KEY)).toBeNull()
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStoreMigration.test.ts`
Expected: FAIL（migration 還沒實作）

- [ ] **Step 3: 在 draftStore.ts 加上 migration / 備份邏輯**

在 `STORAGE_KEY` 常數後新增：

```ts
const V1_KEY = "vector.featureDraft.v1"

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
```

- [ ] **Step 4: 改寫 `hydrate` 函式**

把 Task 3 的 `hydrate` 整段替換為：

```ts
function hydrate(): DraftStoreState {
  if (typeof localStorage === "undefined") return emptyState()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw != null) {
    try {
      const parsed = JSON.parse(raw)
      if (isDraftStoreState(parsed)) return parsed
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
```

`migrateFromV1` 引用了 `generateDraftId`，所以該函式必須在 `migrateFromV1` 之前宣告（Task 3 已放好）。

- [ ] **Step 5: 確認所有測試通過**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts src/features/spec-wizard/__tests__/draftStoreMigration.test.ts`
Expected: PASS（draftStore 三個 + migration 四個 = 七個）

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStore.ts src/features/spec-wizard/__tests__/draftStoreMigration.test.ts
git commit -m "feat: [store] 自動 migration 與壞 storage 備份"
```

---

## Task 5: draftStore — CRUD mutators

實作 `createDraft / selectDraft / setActiveDraft / renameDraft / deleteDraft`，含 active fallback。

**Files:**
- Modify: `src/features/spec-wizard/persistence/draftStore.ts`
- Modify: `src/features/spec-wizard/__tests__/draftStore.test.ts`

- [ ] **Step 1: 在 `draftStore.test.ts` 末尾追加 mutator 測試**

```ts
import {
  createDraft,
  deleteDraft,
  renameDraft,
  selectDraft,
  setActiveDraft
} from "../persistence/draftStore"
import type { FeatureDraft } from "../model/specTypes"

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
    const b = createDraft() // active
    deleteDraft(a)
    const snap = getSnapshot()
    expect(snap.drafts[a]).toBeUndefined()
    expect(snap.meta[a]).toBeUndefined()
    expect(snap.activeDraftId).toBe(b)
  })

  it("deleteDraft falls back active to first remaining (insertion order)", () => {
    const a = createDraft()
    createDraft()
    const c = createDraft() // active
    deleteDraft(c)
    expect(getSnapshot().activeDraftId).toBe(a) // first inserted
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
```

把檔案頂部 import 補上 `vi` 與 `subscribe`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  __resetForTests,
  generateDraftId,
  getSnapshot,
  subscribe
} from "../persistence/draftStore"
```

- [ ] **Step 2: 確認測試失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: FAIL — mutator 函式未匯出

- [ ] **Step 3: 在 `draftStore.ts` 實作 mutators**

在 `__resetForTests` 之前加入（注意要在檔案頂部 import `createEmptyDraft` 與 `Locale`）：

```ts
import { createEmptyDraft } from "../model/defaultDraft"
import type { FeatureDraft, Locale } from "../model/specTypes"
```

並加：

```ts
function setStateAndNotify(next: DraftStoreState): void {
  state = next
  persist(next)
  notify()
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
```

- [ ] **Step 4: 確認測試全綠**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStore.ts src/features/spec-wizard/__tests__/draftStore.test.ts
git commit -m "feat: [store] 新增 CRUD mutators 與 active fallback"
```

---

## Task 6: draftStore — JSON 匯入 / 匯出

**Files:**
- Modify: `src/features/spec-wizard/persistence/draftStore.ts`
- Modify: `src/features/spec-wizard/__tests__/draftStore.test.ts`

- [ ] **Step 1: 在 `draftStore.test.ts` 末尾追加 import/export 測試**

確認檔案頂部已 import `minimalValidDraft`（Task 4 的 migration test 已用過；但本檔還未 import 的話補上）：

```ts
import { minimalValidDraft } from "../test/fixtures"
```

末尾追加：

```ts
import { exportDraftJson, importDraftJson } from "../persistence/draftStore"

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
```

- [ ] **Step 2: 確認測試失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: FAIL — `importDraftJson` / `exportDraftJson` 未匯出

- [ ] **Step 3: 實作 import/export**

把 `draftFromJson` / `draftToJson` 的 import 加到 `draftStore.ts` 頂部其他 import 旁：

```ts
import { draftFromJson, draftToJson } from "./draftStorage"
```

並在 `deleteDraft` 之後新增：

```ts
export function importDraftJson(raw: string): string {
  const draft = draftFromJson(raw) // throws on invalid
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
```

- [ ] **Step 4: 確認測試全綠**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStore.ts src/features/spec-wizard/__tests__/draftStore.test.ts
git commit -m "feat: [store] 新增 JSON 匯入匯出"
```

---

## Task 7: useDraftStore Hook

**Files:**
- Create: `src/features/spec-wizard/hooks/useDraftStore.ts`
- Create: `src/features/spec-wizard/__tests__/useDraftStore.test.tsx`

- [ ] **Step 1: 寫 hook 測試**

Create `src/features/spec-wizard/__tests__/useDraftStore.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useDraftStore } from "../hooks/useDraftStore"
import { __resetForTests } from "../persistence/draftStore"

function Probe() {
  const { activeDraftId, drafts, createDraft } = useDraftStore()
  return (
    <div>
      <span data-testid="active">{activeDraftId ?? "none"}</span>
      <span data-testid="count">{drafts.length}</span>
      <button onClick={() => createDraft()}>create</button>
    </div>
  )
}

describe("useDraftStore", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("starts with empty store and re-renders after createDraft", () => {
    render(<Probe />)
    expect(screen.getByTestId("active").textContent).toBe("none")
    expect(screen.getByTestId("count").textContent).toBe("0")

    act(() => {
      screen.getByText("create").click()
    })

    expect(screen.getByTestId("active").textContent).not.toBe("none")
    expect(screen.getByTestId("count").textContent).toBe("1")
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/useDraftStore.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: 建立 useDraftStore.ts**

Create `src/features/spec-wizard/hooks/useDraftStore.ts`:

```ts
"use client"

import { useSyncExternalStore } from "react"
import type { DraftId, DraftMetaEntry, FeatureDraft } from "../model/specTypes"
import {
  createDraft as createDraftAction,
  deleteDraft as deleteDraftAction,
  exportDraftJson as exportDraftJsonAction,
  getLastWriteError,
  getServerSnapshot,
  getSnapshot,
  importDraftJson as importDraftJsonAction,
  renameDraft as renameDraftAction,
  selectDraft as selectDraftAction,
  setActiveDraft as setActiveDraftAction,
  subscribe
} from "../persistence/draftStore"

export type DraftListEntry = {
  id: DraftId
  draft: FeatureDraft
  meta: DraftMetaEntry
}

export type UseDraftStoreValue = {
  activeDraftId: DraftId | null
  activeDraft: FeatureDraft | null
  drafts: ReadonlyArray<DraftListEntry>
  lastWriteError: Error | null

  createDraft(locale?: FeatureDraft["metadata"]["locale"]): DraftId
  selectDraft(id: DraftId): void
  setActiveDraft(next: FeatureDraft): void
  renameDraft(id: DraftId, title: string): void
  deleteDraft(id: DraftId): void
  importDraftJson(raw: string): DraftId
  exportDraftJson(id: DraftId): string
}

export function useDraftStore(): UseDraftStoreValue {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const lastWriteError = useSyncExternalStore(
    subscribe,
    getLastWriteError,
    () => null
  )

  const drafts: DraftListEntry[] = Object.keys(state.drafts).map((id) => ({
    id,
    draft: state.drafts[id],
    meta: state.meta[id]
  }))

  const activeDraft =
    state.activeDraftId != null ? state.drafts[state.activeDraftId] ?? null : null

  return {
    activeDraftId: state.activeDraftId,
    activeDraft,
    drafts,
    lastWriteError,
    createDraft: createDraftAction,
    selectDraft: selectDraftAction,
    setActiveDraft: setActiveDraftAction,
    renameDraft: renameDraftAction,
    deleteDraft: deleteDraftAction,
    importDraftJson: importDraftJsonAction,
    exportDraftJson: exportDraftJsonAction
  }
}
```

- [ ] **Step 4: 確認測試通過**

Run: `bunx vitest run src/features/spec-wizard/__tests__/useDraftStore.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/hooks/useDraftStore.ts src/features/spec-wizard/__tests__/useDraftStore.test.tsx
git commit -m "feat: [hook] 建立 useDraftStore"
```

---

## Task 8: ConfirmDialog 元件

**Files:**
- Create: `src/features/spec-wizard/components/ConfirmDialog.tsx`

- [ ] **Step 1: 建立元件**

Create `src/features/spec-wizard/components/ConfirmDialog.tsx`:

```tsx
"use client"

import { useEffect, useRef } from "react"

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} onClose={onCancel} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
```

- [ ] **Step 2: 型別檢查**

Run: `bunx tsc --noEmit`
Expected: 沒有錯誤

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/components/ConfirmDialog.tsx
git commit -m "feat: [ui] 新增 ConfirmDialog 通用元件"
```

---

## Task 9: EmptyDraftState 元件

**Files:**
- Create: `src/features/spec-wizard/components/EmptyDraftState.tsx`
- Create: `src/features/spec-wizard/__tests__/emptyStateFlow.test.tsx`

- [ ] **Step 1: 寫測試**

Create `src/features/spec-wizard/__tests__/emptyStateFlow.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { EmptyDraftState } from "../components/EmptyDraftState"
import { I18nProvider } from "../i18n/I18nContext"
import { __resetForTests, getSnapshot } from "../persistence/draftStore"

describe("EmptyDraftState", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("renders welcome copy and creates a draft on CTA click", () => {
    render(
      <I18nProvider>
        <EmptyDraftState />
      </I18nProvider>
    )

    expect(screen.getByText("歡迎")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /新增/ }))
    expect(getSnapshot().activeDraftId).not.toBeNull()
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/emptyStateFlow.test.tsx`
Expected: FAIL — element not found

- [ ] **Step 3: 建立元件**

Create `src/features/spec-wizard/components/EmptyDraftState.tsx`:

```tsx
"use client"

import { useI18n } from "../i18n/I18nContext"
import { useDraftStore } from "../hooks/useDraftStore"

export function EmptyDraftState() {
  const { t, locale } = useI18n()
  const { createDraft } = useDraftStore()

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        padding: "3rem 1rem",
        textAlign: "center"
      }}
    >
      <h2>{t("empty.title")}</h2>
      <p>{t("empty.subtitle")}</p>
      <button type="button" onClick={() => createDraft(locale)}>
        {t("empty.cta")}
      </button>
    </section>
  )
}
```

- [ ] **Step 4: 測試綠燈**

Run: `bunx vitest run src/features/spec-wizard/__tests__/emptyStateFlow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/EmptyDraftState.tsx src/features/spec-wizard/__tests__/emptyStateFlow.test.tsx
git commit -m "feat: [ui] 新增 EmptyDraftState"
```

---

## Task 10: LanguageSwitcher 元件

從 Wizard 抽出語言切換 UI；行為：改 UI locale，且若 active draft 存在則同步其 `metadata.locale`。

**Files:**
- Create: `src/features/spec-wizard/components/LanguageSwitcher.tsx`

- [ ] **Step 1: 建立元件**

Create `src/features/spec-wizard/components/LanguageSwitcher.tsx`:

```tsx
"use client"

import { useI18n } from "../i18n/I18nContext"
import { useDraftStore } from "../hooks/useDraftStore"
import type { Locale } from "../model/specTypes"

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const { activeDraft, setActiveDraft } = useDraftStore()

  return (
    <div className="locale-switcher">
      <select
        value={locale}
        onChange={(event) => {
          const next = event.target.value as Locale
          setLocale(next)
          if (activeDraft) {
            setActiveDraft({
              ...activeDraft,
              metadata: { ...activeDraft.metadata, locale: next }
            })
          }
        }}
        aria-label="Change Language"
      >
        <option value="zh-TW">繁體中文</option>
        <option value="en">English</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 2: 型別檢查**

Run: `bunx tsc --noEmit`
Expected: 沒有錯誤

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/components/LanguageSwitcher.tsx
git commit -m "feat: [ui] 抽出 LanguageSwitcher 元件"
```

---

## Task 11: DraftSwitcher 元件

**Files:**
- Create: `src/features/spec-wizard/components/DraftSwitcher.tsx`
- Create: `src/features/spec-wizard/__tests__/draftSwitcherFlow.test.tsx`

- [ ] **Step 1: 寫測試**

Create `src/features/spec-wizard/__tests__/draftSwitcherFlow.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DraftSwitcher } from "../components/DraftSwitcher"
import { I18nProvider } from "../i18n/I18nContext"
import { __resetForTests, createDraft, getSnapshot } from "../persistence/draftStore"

function renderSwitcher() {
  return render(
    <I18nProvider>
      <DraftSwitcher onOpenManager={() => {}} />
    </I18nProvider>
  )
}

describe("DraftSwitcher", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("shows untitled placeholder when no active draft has title", () => {
    createDraft()
    renderSwitcher()
    expect(screen.getByText(/未命名草稿/)).toBeInTheDocument()
  })

  it("creates a new draft when '新增' is clicked", () => {
    createDraft()
    renderSwitcher()
    fireEvent.click(screen.getByRole("button", { name: /目前草稿|未命名/ }))
    fireEvent.click(screen.getByRole("button", { name: /新增草稿/ }))
    expect(Object.keys(getSnapshot().drafts)).toHaveLength(2)
  })

  it("switches to a different draft when clicked", () => {
    const a = createDraft()
    const b = createDraft()
    expect(getSnapshot().activeDraftId).toBe(b)
    renderSwitcher()
    fireEvent.click(screen.getByRole("button", { name: /目前草稿|未命名/ }))
    const items = screen.getAllByRole("option")
    fireEvent.click(items[0])
    expect(getSnapshot().activeDraftId).toBe(a)
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftSwitcherFlow.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: 建立元件**

Create `src/features/spec-wizard/components/DraftSwitcher.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { useDraftStore } from "../hooks/useDraftStore"

type DraftSwitcherProps = {
  onOpenManager: () => void
}

export function DraftSwitcher({ onOpenManager }: DraftSwitcherProps) {
  const { t, locale } = useI18n()
  const { activeDraftId, activeDraft, drafts, selectDraft, createDraft } =
    useDraftStore()
  const [open, setOpen] = useState(false)

  const currentLabel =
    activeDraft?.metadata.title?.trim() || t("draftSwitcher.untitled")

  return (
    <div className="draft-switcher" style={{ position: "relative" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        {t("draftSwitcher.label")}：{currentLabel} ▼
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            minWidth: "16rem",
            zIndex: 10
          }}
        >
          {drafts.map((entry) => (
            <button
              key={entry.id}
              role="option"
              aria-selected={entry.id === activeDraftId}
              type="button"
              onClick={() => {
                selectDraft(entry.id)
                setOpen(false)
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "0.5rem"
              }}
            >
              {entry.id === activeDraftId ? "✓ " : "  "}
              {entry.draft.metadata.title?.trim() || t("draftSwitcher.untitled")}
            </button>
          ))}
          <hr />
          <button
            type="button"
            onClick={() => {
              createDraft(locale)
              setOpen(false)
            }}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {t("draftSwitcher.new")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenManager()
            }}
            style={{ display: "block", width: "100%", padding: "0.5rem" }}
          >
            {t("draftSwitcher.manage")}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 測試綠燈**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftSwitcherFlow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/DraftSwitcher.tsx src/features/spec-wizard/__tests__/draftSwitcherFlow.test.tsx
git commit -m "feat: [ui] 新增 DraftSwitcher header dropdown"
```

---

## Task 12: DraftManagerModal 元件

**Files:**
- Create: `src/features/spec-wizard/components/DraftManagerModal.tsx`
- Create: `src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx`

- [ ] **Step 1: 寫測試**

Create `src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DraftManagerModal } from "../components/DraftManagerModal"
import { I18nProvider } from "../i18n/I18nContext"
import {
  __resetForTests,
  createDraft,
  getSnapshot,
  renameDraft
} from "../persistence/draftStore"
import { minimalValidDraft } from "../test/fixtures"

function renderModal(onClose = vi.fn()) {
  return render(
    <I18nProvider>
      <DraftManagerModal open={true} onClose={onClose} />
    </I18nProvider>
  )
}

describe("DraftManagerModal", () => {
  beforeEach(() => {
    localStorage.clear()
    __resetForTests()
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  })
  afterEach(() => {
    localStorage.clear()
    __resetForTests()
  })

  it("renders one row per draft with title and actions", () => {
    const a = createDraft()
    renameDraft(a, "進貨單")
    createDraft()
    renderModal()

    expect(screen.getByDisplayValue("進貨單")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^刪除$/ })).toHaveLength(2)
  })

  it("renames a draft on input blur", () => {
    const a = createDraft()
    renderModal()

    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement
    fireEvent.change(input, { target: { value: "改名後" } })
    fireEvent.blur(input)

    expect(getSnapshot().drafts[a].metadata.title).toBe("改名後")
  })

  it("requires confirmation before deleting", () => {
    createDraft()
    renderModal()

    fireEvent.click(screen.getByRole("button", { name: /^刪除$/ }))
    fireEvent.click(screen.getByRole("button", { name: /取消/ }))
    expect(Object.keys(getSnapshot().drafts)).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: /^刪除$/ }))
    fireEvent.click(screen.getByRole("button", { name: /^確定$/ }))
    expect(Object.keys(getSnapshot().drafts)).toHaveLength(0)
  })

  it("imports a JSON file via the file input", async () => {
    renderModal()
    const file = new File(
      [JSON.stringify(minimalValidDraft())],
      "draft.json",
      { type: "application/json" }
    )
    const input = screen.getByLabelText(/匯入 JSON/) as HTMLInputElement
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
    // wait one tick for async file.text()
    await new Promise((r) => setTimeout(r, 0))
    expect(Object.keys(getSnapshot().drafts).length).toBeGreaterThanOrEqual(1)
  })

  it("shows error toast on invalid import", async () => {
    renderModal()
    const file = new File(["{not-json"], "bad.json", { type: "application/json" })
    const input = screen.getByLabelText(/匯入 JSON/) as HTMLInputElement
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
    expect(await screen.findByText(/匯入失敗/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: 建立元件**

Create `src/features/spec-wizard/components/DraftManagerModal.tsx`:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { ConfirmDialog } from "./ConfirmDialog"
import { useI18n } from "../i18n/I18nContext"
import { useDraftStore } from "../hooks/useDraftStore"
import type { DraftId } from "../model/specTypes"

type DraftManagerModalProps = {
  open: boolean
  onClose: () => void
}

export function DraftManagerModal({ open, onClose }: DraftManagerModalProps) {
  const { t, locale } = useI18n()
  const {
    drafts,
    createDraft,
    renameDraft,
    deleteDraft,
    importDraftJson,
    exportDraftJson
  } = useDraftStore()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<DraftId | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      importDraftJson(text)
      setImportError(null)
    } catch {
      setImportError(t("draftManager.importError"))
    } finally {
      event.target.value = ""
    }
  }

  function handleExport(id: DraftId) {
    const json = exportDraftJson(id)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `draft-${id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="dm-title">
      <h2 id="dm-title">{t("draftManager.title")}</h2>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button type="button" onClick={() => createDraft(locale)}>
          {t("draftSwitcher.new")}
        </button>
        <label>
          {t("draftManager.import")}
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
      </div>

      {importError && <p role="alert">{importError}</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {drafts.map((entry) => (
          <li
            key={entry.id}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              padding: "0.5rem 0",
              borderBottom: "1px solid #eee"
            }}
          >
            <input
              type="text"
              defaultValue={entry.draft.metadata.title}
              onBlur={(e) => renameDraft(entry.id, e.target.value)}
              aria-label={t("draftManager.rename")}
              style={{ flex: 1 }}
            />
            <small>
              {entry.draft.metadata.locale} · {t("draftManager.updatedAt")}:{" "}
              {new Date(entry.meta.updatedAt).toLocaleString()}
            </small>
            <button type="button" onClick={() => handleExport(entry.id)}>
              {t("draftManager.export")}
            </button>
            <button type="button" onClick={() => setPendingDeleteId(entry.id)}>
              {t("draftManager.delete")}
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button type="button" onClick={onClose}>
          {t("confirm.cancel")}
        </button>
      </div>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title={t("confirm.deleteDraft.title")}
        message={t("confirm.deleteDraft.message")}
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={() => {
          if (pendingDeleteId) deleteDraft(pendingDeleteId)
          setPendingDeleteId(null)
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </dialog>
  )
}
```

- [ ] **Step 4: 測試綠燈**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/DraftManagerModal.tsx src/features/spec-wizard/__tests__/draftManagerModalFlow.test.tsx
git commit -m "feat: [ui] 新增 DraftManagerModal（改名/刪除/匯入/匯出）"
```

---

## Task 13: AutosaveErrorToast 元件

**Files:**
- Create: `src/features/spec-wizard/components/AutosaveErrorToast.tsx`

- [ ] **Step 1: 建立元件**

Create `src/features/spec-wizard/components/AutosaveErrorToast.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { useDraftStore } from "../hooks/useDraftStore"

export function AutosaveErrorToast() {
  const { t } = useI18n()
  const { lastWriteError } = useDraftStore()
  const [dismissed, setDismissed] = useState(false)

  if (!lastWriteError || dismissed) return null

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        background: "#fee",
        border: "1px solid #c33",
        padding: "0.75rem 1rem",
        zIndex: 50
      }}
    >
      <span>{t("autosave.error")}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{ marginLeft: "0.75rem" }}
      >
        {t("autosave.dismiss")}
      </button>
    </div>
  )
}
```

註：本 MVP 中，使用者按關閉後 `dismissed` 是 component-local state；下次 `lastWriteError` 從 null 變回有值時不會自動重置。可在後續迭代加上 reset 邏輯。

- [ ] **Step 2: 型別檢查**

Run: `bunx tsc --noEmit`
Expected: 沒有錯誤

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/components/AutosaveErrorToast.tsx
git commit -m "feat: [ui] 新增 AutosaveErrorToast"
```

---

## Task 14: AppShell 元件

組合 header（含 DraftSwitcher / LanguageSwitcher）、AutosaveErrorToast、children 主區。

**Files:**
- Create: `src/features/spec-wizard/components/AppShell.tsx`

- [ ] **Step 1: 建立元件**

Create `src/features/spec-wizard/components/AppShell.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { AutosaveErrorToast } from "./AutosaveErrorToast"
import { DraftManagerModal } from "./DraftManagerModal"
import { DraftSwitcher } from "./DraftSwitcher"
import { LanguageSwitcher } from "./LanguageSwitcher"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const [managerOpen, setManagerOpen] = useState(false)

  return (
    <div className="stack">
      <header>
        <div>
          <h1>{t("wizard.title")}</h1>
          <p>{t("wizard.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <DraftSwitcher onOpenManager={() => setManagerOpen(true)} />
          <LanguageSwitcher />
        </div>
      </header>

      <main>{children}</main>

      <DraftManagerModal open={managerOpen} onClose={() => setManagerOpen(false)} />
      <AutosaveErrorToast />
    </div>
  )
}
```

- [ ] **Step 2: 型別檢查**

Run: `bunx tsc --noEmit`
Expected: 沒有錯誤

- [ ] **Step 3: Commit**

```bash
git add src/features/spec-wizard/components/AppShell.tsx
git commit -m "feat: [ui] 新增 AppShell 組合 header 與 manager modal"
```

---

## Task 15: 重構 Wizard — 移除自家 state、autosave、header

**Files:**
- Modify: `src/features/spec-wizard/components/Wizard.tsx`

- [ ] **Step 1: 改寫 Wizard.tsx 開頭與 imports**

打開 `src/features/spec-wizard/components/Wizard.tsx`。

把檔頂的 imports 區塊裡這幾行**刪除**：

```ts
import { useEffect, useMemo, useState } from "react"
import { createEmptyDraft } from "../model/defaultDraft"
import { draftFromJson, loadDraft, saveDraft } from "../persistence/draftStorage"
```

換成：

```ts
import { useMemo, useState } from "react"
import { useDraftStore } from "../hooks/useDraftStore"
import { draftFromJson } from "../persistence/draftStorage"
```

- [ ] **Step 2: 改 `Wizard()` 函式內部 state 初始化**

找到目前的：

```ts
export function Wizard() {
  const { locale, setLocale, t } = useI18n()
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<FeatureDraft>(() => createEmptyDraft(locale))

  useEffect(() => {
    const stored = loadDraft()
    if (stored) setDraft(stored)
  }, [])

  useEffect(() => {
    saveDraft(draft)
  }, [draft])
```

整段替換為：

```ts
export function Wizard() {
  const { locale, t } = useI18n()
  const { activeDraft, setActiveDraft } = useDraftStore()
  const [stepIndex, setStepIndex] = useState(0)

  if (!activeDraft) return null
  const draft = activeDraft
  const setDraft = setActiveDraft
```

注意：`locale` 仍然從 `useI18n()` 解構（因為 useMemo 內部 step 內容會用到）；但 `setLocale` 不再需要。

- [ ] **Step 3: 移除 `<header>` 區塊**

找到 `return (` 後接 `<div className="stack">` 之後的整段：

```tsx
      <header>
        <div>
          <h1>{t("wizard.title")}</h1>
          <p>{t("wizard.subtitle")}</p>
        </div>
        <div className="locale-switcher">
          <select
            value={locale}
            onChange={(event) => {
              const nextLocale = event.target.value as FeatureDraft["metadata"]["locale"]
              setLocale(nextLocale)
              setDraft({ ...draft, metadata: { ...draft.metadata, locale: nextLocale } })
            }}
            aria-label="Change Language"
          >
            <option value="zh-TW">繁體中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </header>
```

整段刪除。同時把外層 `<div className="stack">` 改成 `<>` fragment，對應 `</div>` 改成 `</>`（因為 `AppShell` 已提供 stack 容器）。

- [ ] **Step 4: 移除 useMemo 內部 / 依賴對 `setLocale` 的引用**

找到 `useMemo` 末段（約 460 行附近），把：

```ts
  ], [
    setLocale,
    step,
    t
  ])
```

改成：

```ts
  ], [
    locale,
    step,
    t
  ])
```

（`locale` 仍可能被某些 step 使用；保留為依賴。）

- [ ] **Step 5: 全文搜尋移除 `setLocale` 殘留**

```bash
grep -n "setLocale" src/features/spec-wizard/components/Wizard.tsx
```
Expected: 沒有任何匹配。

- [ ] **Step 6: 型別檢查**

Run: `bunx tsc --noEmit`
Expected: 沒有錯誤

- [ ] **Step 7: 跑既有 wizardFlow 測試（先看狀態，不期待綠）**

Run: `bunx vitest run src/features/spec-wizard/__tests__/wizardFlow.test.tsx`
Expected: 可能 FAIL — Task 18 會修。

- [ ] **Step 8: Commit**

```bash
git add src/features/spec-wizard/components/Wizard.tsx
git commit -m "refactor: [wizard] 改用 useDraftStore，移除自家 autosave 與 header"
```

---

## Task 16: 接通 page.tsx 與 AppShell

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 改寫 page.tsx**

把 `app/page.tsx` 整個替換為：

```tsx
"use client"

import { AppShell } from "@/features/spec-wizard/components/AppShell"
import { EmptyDraftState } from "@/features/spec-wizard/components/EmptyDraftState"
import { Wizard } from "@/features/spec-wizard/components/Wizard"
import { useDraftStore } from "@/features/spec-wizard/hooks/useDraftStore"
import { I18nProvider } from "@/features/spec-wizard/i18n/I18nContext"

function Body() {
  const { activeDraftId } = useDraftStore()
  return activeDraftId ? <Wizard /> : <EmptyDraftState />
}

export default function Home() {
  return (
    <I18nProvider>
      <AppShell>
        <Body />
      </AppShell>
    </I18nProvider>
  )
}
```

註：原本 `app/page.tsx` 是 RSC。改為 `"use client"` 是因為 `useDraftStore` 必須在 client 執行。整個 app 是高度 client-driven，沒有 RSC 收益損失。

- [ ] **Step 2: 啟動 dev server，手動測試**

Run（背景）：`bun run dev`

打開 http://localhost:3000 ，確認：
- 第一次：顯示 EmptyDraftState 「歡迎」CTA
- 點 CTA：進入 Wizard、step 0、列表多一筆未命名草稿
- 重整頁面：仍打開上次的 active draft

- [ ] **Step 3: 跑全測試套件（接受部分失敗）**

Run: `bun run test`
Expected: 大部分綠；剩下 `wizardFlow.test.tsx` / `draftStorage.test.ts` 可能 fail（下個 task 修）

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: [app] 接通 AppShell 與多 draft 流程"
```

---

## Task 17: 縮編 draftStorage.ts 並更新測試

`saveDraft` 與 `clearDraft` 已不再被任何檔案使用；只有 `loadDraft`、`draftToJson`、`draftFromJson` 仍被 store 引用。

**Files:**
- Modify: `src/features/spec-wizard/persistence/draftStorage.ts`
- Modify: `src/features/spec-wizard/__tests__/draftStorage.test.ts`

- [ ] **Step 1: 縮編 draftStorage.ts**

把 `src/features/spec-wizard/persistence/draftStorage.ts` 整個替換為：

```ts
import type { FeatureDraft } from "../model/specTypes"

export const DRAFT_STORAGE_KEY = "vector.featureDraft.v1"

/**
 * @deprecated 僅供 draftStore migration 使用，新程式碼請用 draftStore.ts。
 */
export function loadDraft(): FeatureDraft | null {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as FeatureDraft
  } catch {
    return null
  }
}

export function draftToJson(draft: FeatureDraft): string {
  return JSON.stringify(draft, null, 2)
}

export function draftFromJson(raw: string): FeatureDraft {
  const parsed = JSON.parse(raw) as FeatureDraft
  if (!parsed.metadata || !parsed.goal || !Array.isArray(parsed.epics)) {
    throw new Error("Invalid draft JSON")
  }
  return parsed
}
```

- [ ] **Step 2: 更新 draftStorage.test.ts**

把 `src/features/spec-wizard/__tests__/draftStorage.test.ts` 整個替換為：

```ts
import { beforeEach, describe, expect, it } from "vitest"
import { draftFromJson, draftToJson, loadDraft } from "../persistence/draftStorage"
import { minimalValidDraft } from "../test/fixtures"

describe("draftStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("loadDraft returns null when storage is empty", () => {
    expect(loadDraft()).toBeNull()
  })

  it("loadDraft returns the parsed draft when v1 key is set", () => {
    const draft = minimalValidDraft()
    localStorage.setItem("vector.featureDraft.v1", JSON.stringify(draft))
    expect(loadDraft()).toEqual(draft)
  })

  it("loadDraft returns null when v1 key contains invalid JSON", () => {
    localStorage.setItem("vector.featureDraft.v1", "not-json")
    expect(loadDraft()).toBeNull()
  })

  it("draftToJson then draftFromJson round-trips a draft", () => {
    const draft = minimalValidDraft()
    const json = draftToJson(draft)
    expect(draftFromJson(json)).toEqual(draft)
  })

  it("draftFromJson throws on missing required fields", () => {
    expect(() => draftFromJson(JSON.stringify({ no: "metadata" }))).toThrow()
  })
})
```

- [ ] **Step 3: 跑該測試**

Run: `bunx vitest run src/features/spec-wizard/__tests__/draftStorage.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/spec-wizard/persistence/draftStorage.ts src/features/spec-wizard/__tests__/draftStorage.test.ts
git commit -m "refactor: [storage] 縮編 draftStorage 為純 JSON helpers + v1 read"
```

---

## Task 18: 修補 wizardFlow 測試

舊 `wizardFlow.test.tsx` 直接 render Wizard 並驗證初始空白狀態 — 現在 Wizard 不再有 active draft 就 return null，所以測試前需要先建一份 draft。

**Files:**
- Modify: `src/features/spec-wizard/__tests__/wizardFlow.test.tsx`

- [ ] **Step 1: 看現況失敗訊息**

Run: `bunx vitest run src/features/spec-wizard/__tests__/wizardFlow.test.tsx`
Expected: FAIL — 多半是「render 出來什麼也沒有」或 `Cannot read properties of null`。

- [ ] **Step 2: 在每個 test 前先建 active draft**

打開 `src/features/spec-wizard/__tests__/wizardFlow.test.tsx`，在 `describe(...)` 內找到 `beforeEach`；若沒有則新增。確保它執行：

```ts
import { __resetForTests, createDraft } from "../persistence/draftStore"

beforeEach(() => {
  localStorage.clear()
  __resetForTests()
  createDraft()
})
```

如果原本的 `beforeEach` 已有 `localStorage.clear()` 等初始化，把上面三行併入即可。

如果某些測試直接從 localStorage 預塞 v1 key 來驗 hydrate 行為，把它改寫成：移除 v1 預塞，呼叫 `createDraft()` + 後續用 `setActiveDraft` 補欄位。

實務上多數測試本意是測 step navigation 或 field 邏輯，加 `createDraft()` 後通常就過。

- [ ] **Step 3: 跑該測試**

Run: `bunx vitest run src/features/spec-wizard/__tests__/wizardFlow.test.tsx`
Expected: PASS

- [ ] **Step 4: 跑全測試套件**

Run: `bun run test`
Expected: 全綠

- [ ] **Step 5: 跑 build**

Run: `bun run build`
Expected: 成功（含 `tsc --noEmit`）

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/__tests__/wizardFlow.test.tsx
git commit -m "test: [wizard] 更新 wizardFlow 測試以配合 draftStore"
```

---

## Task 19: 端到端手動驗證

純驗收，無檔案變動。

- [ ] **Step 1: 啟動 dev**

Run（背景）：`bun run dev`

- [ ] **Step 2: 走過驗收清單**

開瀏覽器到 http://localhost:3000 ，依序驗證：

- [ ] 第一次（清空 localStorage）：顯示 EmptyDraftState
- [ ] 點 CTA → 進 Wizard step 0、列表多一筆「未命名草稿」
- [ ] 填標題「進貨單」→ DraftSwitcher 顯示「進貨單」
- [ ] Dropdown「+ 新增草稿」→ 主區欄位空白、列表 2 筆
- [ ] 切回第一份 → 「進貨單」欄位回來
- [ ] 「⚙ 管理」→ DraftManagerModal 出現、列表 2 列
- [ ] 改名某一份 → blur 後 Switcher 反映
- [ ] 刪除某一份 → ConfirmDialog → 確定 → 列表少一筆
- [ ] 全部刪光 → 主區回到 EmptyDraftState
- [ ] 匯出 JSON → 下載檔案
- [ ] 匯入剛剛的 JSON → 列表多一筆、active 切過去
- [ ] 匯入壞檔 → 顯示「匯入失敗」
- [ ] 切語言 → UI 文字立即切；active draft 的 metadata.locale 同步（檢查匯出 YAML 的 metadata.locale）
- [ ] 重整頁面 → 上次 active draft 仍打開
- [ ] 驗證 v1 → v2 migration：在 DevTools 執行
  ```js
  localStorage.clear()
  localStorage.setItem("vector.featureDraft.v1", JSON.stringify({metadata:{title:"舊資料",owner:"",locale:"zh-TW"},summary:{},goal:{statement:"x",successSignals:[]},impacts:[],deliverables:[],userActivities:[],epics:[{id:"EP-001",title:"",stories:[]}],agentBoundaries:{nonGoals:[],constraints:[],testExpectations:[],risks:[],openQuestions:[]}}))
  location.reload()
  ```
  預期：自動搬成第一份 draft、v1 key 消失、v2 key 寫入

- [ ] **Step 3: 收尾 — 跑最後一次全測試 + build**

```bash
bun run test
bun run build
```

Expected: 全綠

---

## Self-Review

### Spec coverage 對照

| Spec 段落 | 實作於 |
|-----------|--------|
| §1 目的 / 驅動需求 | 整體 |
| §2 In scope: 多份獨立 Draft | Task 5 |
| §2 In scope: Header Switcher | Task 11 |
| §2 In scope: Manager Modal | Task 12 |
| §2 In scope: 0 draft empty state | Task 9 |
| §2 In scope: v1 migration | Task 4 |
| §2 In scope: active draft 持久化 | Task 4（store hydrate 內含 activeDraftId） |
| §2 Invariant 1: active fallback | Task 5 |
| §2 Invariant 2: migration only once | Task 4（v2 存在時跳過 v1 read） |
| §2 Invariant 3: import 不破壞 | Task 6 |
| §2 Invariant 4: DraftId 唯一 | Task 3 |
| §2 Invariant 5: FeatureDraft shape 不變 | Task 2（meta 在 sibling map） |
| §2 Invariant 6: YAML 匯出語意不變 | Task 15（Wizard 內既有匯出邏輯不動） |
| §3 使用者流程（4 種情境） | Task 16, Task 19 |
| §4.1 模組佈局 | 全 task |
| §4.2 storage shape | Task 2, 3, 4 |
| §4.3 Page 結構 | Task 16 |
| §5 Hook API | Task 7 |
| §6 資料流（6 種） | Task 3-6, 15 |
| §7 元件規格 | Task 8-14 |
| §8 錯誤處理（8 種） | Task 4（#1, #3, #6, #7）、Task 12（#4）、Task 5（#5）、Task 13（#2 UI）|
| §9 測試策略 | Task 3-12 |
| §10 未來路徑 | 不在本次 scope |
| §11 i18n 鍵值 | Task 1 |
| §12 既有設計相容 | Task 17, 18 |

無未對應的 spec 條目。

### Type / 命名 consistency 確認

- `DraftId = string`：全程一致
- `DraftStoreState.drafts = Record<DraftId, FeatureDraft>`、`meta = Record<DraftId, DraftMetaEntry>`：task 3-6 使用一致
- `useDraftStore()` 暴露的方法名與 store 純函式同名：`createDraft / selectDraft / setActiveDraft / renameDraft / deleteDraft / importDraftJson / exportDraftJson`
- `setActiveDraft(next: FeatureDraft)` 簽名與 Wizard 改寫後（Task 15）一致：`const setDraft = setActiveDraft`
- `LanguageSwitcher`（Task 10）呼叫 `setActiveDraft({ ...activeDraft, metadata: {...} })` — 簽名一致
- `ConfirmDialog` props（Task 8）與 `DraftManagerModal` 用法（Task 12）一致

### Placeholder scan

- 所有 step 都有具體 code block 或 command。無 "TBD"、"TODO"、"implement later"、"add appropriate error handling"。
- Task 18 step 2 提到「逐一判讀現有 wizardFlow 測試」— 這是合理的，因為現有測試內容只有實際執行者看到才確定；step 已給出具體修補方向（在 beforeEach 加 createDraft）。

### 已知小取捨

- `AutosaveErrorToast` dismiss state 不會在新錯誤觸發時自動重置（Task 13 已註明）。
- `wizardFlow.test.tsx` 細節修補（Task 18）依賴現有測試內容；對於本次不在 scope 的細節留給執行者判讀。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-multi-draft-management.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
