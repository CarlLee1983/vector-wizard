# Multi-Draft Management 設計

Date: 2026-04-27
Status: Approved for planning
Project: Vector
Builds on: `2026-04-26-agile-roadmap-wizard-design.md`

## 1. 目的

擴充 `vector-agile-roadmap-wizard` 從單一 Feature Draft 升級為**多份獨立 Draft 管理**。

驅動需求：

1. 目前 Wizard 一旦填過就無法清空，autosave 永久綁在單一 `localStorage` key。
2. 真實使用情境是「從零打整個系統」（例如進銷存：進貨、銷貨、庫存盤點…），需要逐功能跑一遍 Wizard，並且能在多份 Draft 之間切換、新增、刪除、匯入匯出。

本次擴充**不做**：

- 系統 / 專案分組（多份 Draft 歸屬同一個 Project）
- 跨功能分析（系統級角色清單、功能間依賴）
- 多分頁併發同步、衝突解決
- 多裝置同步、後端持久化、登入

這些保留為未來可選升級路徑（見 §10）。

## 2. 範圍與不變式

### In scope

- 多份獨立 `FeatureDraft` 並存，全部以單一 `localStorage` key 持久化
- Header 下拉「Draft Switcher」做快速切換 + 「+ 新增」+ 「⚙ 管理」
- 「Draft Manager Modal」做改名、刪除（含確認對話框）、匯出 JSON、匯入 JSON、新增
- 0 份 Draft 時的 Empty State 歡迎畫面 + CTA
- 從舊 v1 單份 storage key 自動 migration 為第一份 Draft
- Active draft 持久化：重啟時打開上次的 Draft

### Out of scope

如 §1 所列。

### Invariants（store 集中保證）

1. **`activeDraftId` 一定指向 `drafts` 裡存在的 id，否則為 `null`。** 任何 mutation 後若指向消失（例如刪除 active draft），自動 fallback 到剩餘第一份；若 `drafts` 為空則設為 `null`。
2. **Migration 只執行一次。** 若 v2 key 已存在，跳過 v1 讀取（避免覆蓋使用者後續的修改）。
3. **匯入永不破壞既有 Draft。** JSON 匯入永遠新增一份 Draft、產生新 id、設為 active。原 Draft 保持原樣。
4. **DraftId 在 store 內全域唯一。** 用 `crypto.randomUUID()`，不存在時 fallback `Date.now().toString(36) + Math.random().toString(36).slice(2, 10)`。
5. **`FeatureDraft` shape 不變。** `lastUpdatedAt`、`createdAt` 等 metadata 放在 store level 的 sibling map，**不**污染匯出 YAML。
6. **YAML 匯出語意完全不變。** 僅匯出當下 active draft，schema 與 schemaVersion 沿用 `2026-04-26` 設計。

## 3. 使用者流程

### 3.1 第一次進站（無任何 storage）

1. 看到 Empty State：「歡迎 — 開始你的第一個想法」 + 「+ 新增草稿」CTA。
2. 點 CTA → 建立空白 Draft、切到 Wizard step 0（基本資料）、focus 標題欄。

### 3.2 第一次進站（有舊 v1 storage）

1. Store 初始化時偵測到 `vector.featureDraft.v1`，自動搬成一份 Draft（id 自動產生、設為 active）、刪除 v1 key、寫入 v2 key。
2. 使用者看到 Wizard 載入了原本的 Draft 內容，header 上的 Draft Switcher 顯示一份 Draft。

### 3.3 一般使用（已有多份 Draft）

1. 重啟 → 自動打開上次 active 的 Draft（若該 id 已被刪則 fallback 到第一份；都沒有則回 Empty State）。
2. Header 下拉切換 Draft；列表顯示每份 Draft 的 `metadata.title`，空白標題顯示「未命名草稿」。
3. 「+ 新增」立刻建空白 Draft 並切過去；「⚙ 管理」開 Modal 做改名 / 刪除 / 匯入 / 匯出。
4. 任何欄位改動 → 自動寫回 storage（沿用現有 autosave 直覺，但寫入路徑改走 store）。

### 3.4 刪除最後一份 Draft

→ 回到 Empty State。不彈窗、不報錯。

## 4. 架構

### 4.1 模組佈局

```
src/features/spec-wizard/
├── model/
│   ├── specTypes.ts          (+ DraftId, DraftStoreState, DraftMetaEntry)
│   └── defaultDraft.ts       (沿用 createEmptyDraft)
├── persistence/
│   ├── draftStorage.ts       (DEPRECATE：保留 v1 讀取函式給 migration 用)
│   └── draftStore.ts         🆕 純函式 store
├── hooks/
│   └── useDraftStore.ts      🆕 React hook (useSyncExternalStore)
├── components/
│   ├── AppShell.tsx          🆕 Header + 主區插槽
│   ├── DraftSwitcher.tsx     🆕 Header dropdown
│   ├── DraftManagerModal.tsx 🆕 完整管理 modal
│   ├── EmptyDraftState.tsx   🆕 歡迎畫面
│   ├── LanguageSwitcher.tsx  🆕 從 Wizard 抽出
│   ├── ConfirmDialog.tsx     🆕 最簡確認對話框
│   ├── Wizard.tsx            ♻ 移除自家 draft state、autosave、header
│   ├── WizardStep.tsx        無變
│   ├── FieldArray.tsx        無變
│   ├── ReviewPanel.tsx       無變
│   └── AssistButton.tsx      無變
├── i18n/
│   └── dictionaries.ts       (+ Switcher / Modal / Empty / Confirm 鍵值)
└── __tests__/
    ├── draftStore.test.ts            🆕
    ├── draftStoreMigration.test.ts   🆕
    ├── useDraftStore.test.tsx        🆕
    ├── draftSwitcherFlow.test.tsx    🆕
    ├── draftManagerModalFlow.test.tsx 🆕
    └── emptyStateFlow.test.tsx       🆕
```

### 4.2 儲存層

- 舊 key：`vector.featureDraft.v1`（單份 draft，**唯讀並用於 migration**，遷移成功即移除）
- 新 key：`vector.draftStore.v1`，shape：

  ```ts
  type DraftId = string

  type DraftMetaEntry = {
    createdAt: number  // epoch ms
    updatedAt: number  // epoch ms
  }

  type DraftStoreState = {
    version: 1
    activeDraftId: DraftId | null
    drafts: Record<DraftId, FeatureDraft>
    meta: Record<DraftId, DraftMetaEntry>
  }
  ```

  `Record` 的字串鍵插入順序在 ES2015+ 穩定、JSON 來回保留，因此不額外維護 order array。
  `activeDraftId` 隨 store 一同持久化於 v2 key，因此「重啟時打開上次的 Draft」不需另外追加 storage key 或機制——`hydrate()` 套用後即生效。

- `corrupt backup` key 命名：`vector.draftStore.v1.corrupt-{epochMs}`、`vector.featureDraft.v1.corrupt-{epochMs}`

### 4.3 Page 結構

```
app/page.tsx
└── <I18nProvider>
    └── <AppShell>                           // 含 header / DraftSwitcher / LanguageSwitcher
        └── activeDraftId
            ? <Wizard />
            : <EmptyDraftState />
```

`AppShell` 從 `useDraftStore()` 拿 `activeDraftId`，依此決定主區渲染哪個。

## 5. Hook API

```ts
function useDraftStore(): {
  // 讀
  activeDraftId: DraftId | null
  activeDraft: FeatureDraft | null
  drafts: ReadonlyArray<{ id: DraftId; draft: FeatureDraft; meta: DraftMetaEntry }>

  // 寫
  createDraft(): DraftId                       // 建空白 (用當前 UI locale) + 設為 active + 回傳 id
  selectDraft(id: DraftId): void
  setActiveDraft(next: FeatureDraft): void     // 取代當前 active draft；簽名與既有 Wizard setDraft 一致
  renameDraft(id: DraftId, title: string): void  // 等同更新 metadata.title，不影響 active
  deleteDraft(id: DraftId): void               // 自動 fallback active
  importDraftJson(raw: string): DraftId        // 解析 → 新增 → 設為 active；失敗 throw
  exportDraftJson(id: DraftId): string

  // 觀測
  lastWriteError: Error | null                 // autosave 失敗時設值，UI 顯示 toast
}
```

底層以模組級 store + `useSyncExternalStore` 訂閱。autosave 由 store 自己負責（任何 setter 後 → 寫 `vector.draftStore.v1`），元件不再持有 `useEffect(saveDraft, [draft])`。

## 6. 資料流

### 6.1 啟動順序

```
[App 載入]
  ↓
useDraftStore() 第一次被呼叫 → store 模組做 lazy hydrate
  ↓
讀 vector.draftStore.v1
  ├─ 存在且合法 → 套用、結束
  ├─ 存在但壞 → 改名為 *.corrupt-{ts}、跳過 migration、空 store
  └─ 不存在 → 嘗試 migrateFromV1()
              ├─ vector.featureDraft.v1 存在且合法 →
              │     建一份新 draft（id = randomUUID(), 內容 = 該 draft）
              │     寫入 v2、設為 active、刪除 v1 key
              ├─ 存在但壞 → 改名為 *.corrupt-{ts}、空 store
              └─ 不存在 → 空 store
  ↓
AppShell 依 activeDraftId 決定渲染 Wizard 或 EmptyDraftState
```

Migration 是同步函式，只跑一次（v2 寫進去就不會再進這分支）。

### 6.2 編輯 Active Draft

```
User 在 WizardStep 修改欄位
  → onChange 觸發 setActiveDraft(nextDraft)
  → store 內部：
      drafts[activeDraftId] = nextDraft
      meta[activeDraftId].updatedAt = Date.now()
      writeStorage()
      notifySubscribers()
  → 訂閱者（Wizard、DraftSwitcher 標題、DraftManagerModal 列表）re-render
```

### 6.3 新增 Draft

```
createDraft()
  → id = generateDraftId()
  → drafts[id] = createEmptyDraft(currentUiLocale)
  → meta[id] = { createdAt: now, updatedAt: now }
  → activeDraftId = id
  → writeStorage + notify
  → 回傳 id
UI 端：呼叫者收到 id 後自行決定要不要把 step 重置到 0、focus 標題欄。
       DraftSwitcher 與 EmptyDraftState 都會這樣做。
```

### 6.4 刪除 Draft（含 active fallback）

```
deleteDraft(id)
  → 從 drafts、meta 移除 id
  → 若 id === activeDraftId：
      activeDraftId = drafts 第一個剩餘 id（依插入順序）；若無 → null
  → writeStorage + notify
```

刪除前的確認在 UI 端 ConfirmDialog 完成，store 不再二次確認。

### 6.5 匯入 JSON

```
importDraftJson(raw)
  → JSON.parse + 跑既有 draftFromJson() 驗證 schema
  → id = generateDraftId()
  → drafts[id] = parsed
  → meta[id] = { createdAt: now, updatedAt: now }
  → activeDraftId = id
  → writeStorage + notify
  → 回傳 id
```

### 6.6 語言切換

```
LanguageSwitcher onChange(nextLocale)
  → I18nContext.setLocale(nextLocale)
  → if (activeDraft) setActiveDraft({
       ...activeDraft,
       metadata: { ...metadata, locale: nextLocale }
     })
```

切換 active draft 時**不**改 UI locale。

## 7. 元件規格

### 7.1 `<AppShell>`

- 結構：`<header><h1/></h1><DraftSwitcher/><LanguageSwitcher/></header><main>{children}</main>`
- 把目前 `Wizard.tsx` 開頭的 `<header>` 整段搬出來。
- 監聽 `useDraftStore().lastWriteError`：非 `null` 時於 `<main>` 上方渲染 `<AutosaveErrorToast>`（最簡實作：固定位置浮層 + 文字 `t("autosave.error")` + 關閉按鈕）。

### 7.2 `<DraftSwitcher>`

- 顯示：`目前：{activeDraft?.metadata.title || t("draftSwitcher.untitled")}` + ▼
- Dropdown：
  - 草稿列表：每列 `metadata.title`（空白 → `t("draftSwitcher.untitled")`），點擊 → `selectDraft(id)`，當前項打勾
  - Divider
  - `+ 新增草稿` → `createDraft()` → 自動 focus 主區標題欄
  - `⚙ 管理` → 開 `DraftManagerModal`
- A11y：`role="combobox"` + `aria-expanded` + 鍵盤 ↑↓ Enter Esc
- `drafts.length === 0` 時：顯示 `t("draftSwitcher.empty")`，整顆 = `+ 新增`

### 7.3 `<DraftManagerModal>`

- 用 `<dialog>` 元素。
- 頂部工具列：`+ 新增`、`匯入 JSON`（`<input type="file">`）。
- 列表，每列：
  - Title 雙擊 / 鉛筆按鈕進入編輯模式 → `renameDraft`
  - 副資訊：`metadata.locale` tag、`meta.updatedAt` 相對時間
  - 動作：`匯出 JSON`、`刪除`
- 刪除 → 內嵌 `<ConfirmDialog>` → 確認後 `deleteDraft(id)`
- 匯入失敗：顯示 `t("draftManager.importError")`，state 不變。

### 7.4 `<EmptyDraftState>`

- 置中卡片：`t("empty.title")` / `t("empty.subtitle")` / CTA `t("empty.cta")`
- CTA → `createDraft()` → 切到 Wizard step 0、focus 標題欄

### 7.5 `<LanguageSwitcher>`

- 從 `Wizard.tsx` 抽出。介面同既有，但行為改走 store：
  - 一律 `setLocale(nextLocale)`
  - `activeDraft` 存在時呼叫 `setActiveDraft({ ...d, metadata: { ...m, locale: nextLocale } })`

### 7.6 `<ConfirmDialog>`

- 最簡實作：受控 `open` prop、`title`、`message`、`onConfirm`、`onCancel`、用 `<dialog>` + 兩顆按鈕。

### 7.7 `<Wizard>` 瘦身

從 `Wizard.tsx` 移除：

- `useState<FeatureDraft>(...)`
- 兩個 `useEffect`（loadDraft / saveDraft）
- `<header>` 區塊
- 直接 import `loadDraft / saveDraft` 的呼叫

改成：

```tsx
const { activeDraft, setActiveDraft } = useDraftStore()
if (!activeDraft) return null   // AppShell 已在外層擋掉，這裡是型別保險
const draft = activeDraft
const setDraft = setActiveDraft
```

## 8. 錯誤處理

| # | 失敗情境 | 行為 |
|---|---------|------|
| 1 | `vector.draftStore.v1` 內容是壞 JSON 或 shape 不對 | `try/catch` parse；失敗 → 改名為 `vector.draftStore.v1.corrupt-{ts}`、空 store 起步、console warning。**不**進 migration（避免覆蓋備份）。|
| 2 | `localStorage.setItem` 拋 `QuotaExceededError` | catch；in-memory state 維持最新；`lastWriteError` 設值，UI 顯示 toast「自動存檔失敗，請匯出 JSON 備份」。可繼續編輯但下次重啟會掉。|
| 3 | `vector.featureDraft.v1` migration 來源解析失敗 | 同 #1 處理。|
| 4 | 使用者匯入的 JSON 格式錯 | `draftFromJson` throw → `importDraftJson` re-throw → UI catch 顯示 i18n 訊息。state 不變。|
| 5 | 刪除最後一份 Draft | `activeDraftId = null`；`AppShell` 切到 `EmptyDraftState`。 |
| 6 | `crypto.randomUUID` 不存在 | `generateDraftId()` fallback。|
| 7 | SSR / Next.js server render：`localStorage` 不存在 | `useSyncExternalStore` 的 `getServerSnapshot` 回傳空 store；client mount 後再 hydrate。|
| 8 | 同一 id 競態建立兩次 | 不處理（單 thread）。|

原則：

- 永不靜默丟資料：壞掉的 storage 一律改名備份。
- autosave 失敗不阻塞輸入。
- 匯入失敗不污染 state。
- Migration 只試一次。

## 9. 測試策略

### 9.1 純函式（最大宗）

`draftStore.test.ts`：建立、更新、重新命名、切換、刪除（active / 非 active / 最後一份）、匯入合法 / 非法、storage 寫入往返。

`draftStoreMigration.test.ts`：v1 → v2、v2 已存在時 v1 被忽略、v1 壞、v2 壞、空 storage。

### 9.2 Hook 層

`useDraftStore.test.tsx`：兩個元件訂閱同一 store 的 re-render；SSR snapshot。

### 9.3 UI 整合（關鍵流程）

`draftSwitcherFlow.test.tsx`：dropdown 新增 / 切換。

`draftManagerModalFlow.test.tsx`：改名 / 刪除（含 ConfirmDialog）/ 匯入合法 / 匯入錯誤訊息。

`emptyStateFlow.test.tsx`：0 draft 時顯示、CTA 後進 Wizard。

### 9.4 既有測試影響

- 不變：`yamlSerializer / summary / assistService / generateSpecRoute / assistRoute / validation`
- 改寫或刪除：`draftStorage` 相關
- 微調：Wizard 自家 autosave 相關測試

### 9.5 驗收門檻

- 新增 `draftStore` 純函式 ≥ 95% line coverage
- UI 整合測試覆蓋四個關鍵流程：新增 / 切換 / 刪除（含 fallback）/ 匯入
- `bun run test` 全綠
- `bun run build`（含 `tsc --noEmit`）綠燈

## 10. 未來可選升級路徑（非本次 scope）

1. **Project / 系統分組**：在 Draft 之上加一層 Project，把多份 Draft 收在一個系統底下。
2. **跨功能分析輔助**：Project 層的角色清單、功能間依賴、整體 backlog 排序。
3. **多分頁同步**：監聽 `storage` event 即時同步。
4. **Trash + Undo**：軟刪除分頁、N 天自動清。
5. **後端持久化 / 多人協作**：登入、雲端同步、權限管理。

這些路徑與本次設計**相容**——`DraftStoreState` 加一層 Project 不需重構 Wizard；`storage` event 監聽是 store 內部加 subscriber；軟刪除是 store mutation 行為改變、UI 與 hook 不動。

## 11. UI 字串 i18n（新增鍵值清單）

| Key | zh-TW | en |
|-----|-------|----|
| `draftSwitcher.label` | 目前草稿 | Current draft |
| `draftSwitcher.untitled` | 未命名草稿 | Untitled draft |
| `draftSwitcher.new` | + 新增草稿 | + New draft |
| `draftSwitcher.manage` | ⚙ 管理 | ⚙ Manage |
| `draftSwitcher.empty` | + 開始第一個草稿 | + Start your first draft |
| `draftManager.title` | 草稿管理 | Manage drafts |
| `draftManager.import` | 匯入 JSON | Import JSON |
| `draftManager.importError` | 匯入失敗：JSON 格式不正確 | Import failed: invalid JSON |
| `draftManager.export` | 匯出 JSON | Export JSON |
| `draftManager.delete` | 刪除 | Delete |
| `draftManager.rename` | 重新命名 | Rename |
| `draftManager.updatedAt` | 上次更新 | Last updated |
| `confirm.deleteDraft.title` | 確定刪除草稿？ | Delete draft? |
| `confirm.deleteDraft.message` | 確定刪除「{title}」？此動作無法還原。 | Delete "{title}"? This cannot be undone. |
| `confirm.confirm` | 確定 | Confirm |
| `confirm.cancel` | 取消 | Cancel |
| `empty.title` | 歡迎 | Welcome |
| `empty.subtitle` | 開始你的第一個想法 | Start your first idea |
| `empty.cta` | + 新增草稿 | + New draft |
| `autosave.error` | 自動存檔失敗，請匯出 JSON 備份 | Autosave failed. Please export JSON as backup. |

實際 key naming / 文案以實作時通盤校對為準，但不增減語意。

## 12. 與既有設計的相容性

- `FeatureDraft` shape 完全不變 → `yamlSerializer / summary / assistService / generate-spec route / assist route` 全不需改。
- 既有 `__tests__/` 多數不受影響。
- `schemaVersion` 維持 `"0.1"`。
- 全部 invariants 自既有設計繼承（YAML 鍵值英文、draft schema vs YAML schema 分離、loose validation、AI 非權威、LLM key 伺服器端、不可變更新）。
