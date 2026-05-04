# Wizard Action Panel 設計

Date: 2026-05-04
Status: Approved for planning
Project: Vector
Builds on: `2026-04-26-agile-roadmap-wizard-design.md`
Replaces (in scope): 既有 `AssistantPanel` + `assistantBridge` + 自由 chat textarea 互動模型

## 1. 目的

把目前的 `AssistantPanel`（自由文字 Claude chat）改造為**綁 Wizard step 的協助性介入面板**。

驅動問題：

- 現行 Panel 是通用 Claude chat：可任意輸入、可呼叫所有工具（Read / Bash / Edit / WebFetch…）、可討論任何主題。
- 因為什麼都能做，反而沒有任何一件事是 Panel「明確該負責」的。使用者打開它不知道要幹嘛，Wizard 的欄位它也不會主動協助補。
- 結果：自由度高、實用性低，跟 Wizard 的填表流程脫鉤。

本次重構把 Panel 從「通用對話視窗」收斂為「目前 step 的結構化動作菜單」。

本次重構**不做**：

- 跨 step 主動建議（任何「我看到你還沒填 X，要不要我來」式的 push 行為）
- 自由文字輸入（textarea + Send）
- Panel 直接 mutate draft（任何寫入都需經預覽 → 採用閘道）
- 整份 Feature 的端到端代寫（仍由 SeedPromptSection 的「請求 agent draft」承擔）
- Stories 以外 step 的 actions 實作（v2 任務）
- **新增 user story**（`stories.draft` action）— 現行 StoriesStep 是 single-epic / single-story UI，沒有多 stories 列表可插入新項目。「補新 story」連同「多 stories UI」一起延後到 v2

> **Spec amendment 2026-05-04**: 既有 spec 草稿假設 Wizard 已支援多 stories；實際上 `StoriesStep.tsx` 只渲染 `epics[0].stories[0]`。v1 收斂到 3 個只動既有單一 story 的 actions（rewrite / gaps / consistency），相關 path 使用 `epics[0].stories[0].userStory` 形態。下方 §3、§6、§7 已依此修正。

## 2. 範圍與不變式

### In scope（v1）

- 用 `WizardActionPanel` 取代 `AssistantPanel`：標頭 + 動作菜單 + 結果卡片堆疊三層
- 引入 `actionRegistry`：每個 Wizard step 對應一組 action 定義
- 引入 `actionRunner`：把「action + draft 上下文 + 選定欄位（如有）」組成 prompt → 呼叫 `claudeProvider` → 解析結構化回應
- 引入 `useWizardContext`：Wizard 把 `currentStepId` / `selectedItemId` / `activeDraft` 廣播給 Panel
- v1 actions 限縮在 **Stories step**，共 **3 個**：rewrite / gaps / consistency（見 §6）。`stories.draft`（新增 story）延後 v2。
- 結果以 `ActionResultCard` 顯示，含預覽、採用、丟棄、繼續調整
- 「採用」走 `useDraftStore.applyActionResult({ targetPath, value, mode })` 單一閘道寫入
- `claudeProvider` spawn 時透過 CLI flag 鎖死工具集（不允許 Read / Bash / Edit / Web 等）
- 移除 `AssistantPanel.tsx` / `assistantBridge.ts` / `chatItem.ts` / 自由 textarea 程式碼
- 移除 `SeedPromptSection` 的「送進 panel」按鈕

### Out of scope

如 §1 後段所列。額外明確排除：

- v1 不為非 Stories step 註冊任何 action（其他 step 點開 Panel 顯示「此步驟尚未提供動作」空狀態）
- v1 不做 action 結果的多步驟推理 / chain-of-action
- v1 不做 action 結果歷史的跨 session 持久化（result stack 重整頁就清空）

### Invariants（必須通過測試守住）

1. **Action 永不直接 mutate draft。** 任何寫入都必經 `applyActionResult`，並必須先存在於 result stack 上、被使用者按下「採用」。
2. **YAML 匯出語意零變動。** 本次重構不動 `FeatureDraft`、`normalizeDraftForExport`、`yamlSerializer`、`schemaVersion`。Panel 行為只影響 draft 編輯路徑，不影響匯出契約。
3. **預覽必須揭露完整將寫入內容。** Card 上看到的 `text` 即是採用後寫入 draft 的內容；不允許「採用後另行加工」。
4. **結構化解析失敗時，禁止退化成自由文字採用。** 若 `actionRunner` 無法解析結構化區塊，Card 顯示原始回應 + 紅色錯誤標記，並停用「採用」按鈕。
5. **Tool 鎖死。** `claudeProvider` 不得在無 explicit override 的情況下放行 Read / Bash / Edit / WebFetch / WebSearch / NotebookEdit / TodoWrite / Glob / Grep。v1 Panel 使用全鎖。
6. **Panel 完全被動。** 不在背景偵測 step 缺漏、不主動 emit 訊息、不註冊任何 timer / interval。所有動作起點都是使用者點擊。
7. **Wizard step 切換不清空 result stack。** 使用者切到別的 step 也能繼續看到剛才在 Stories 拿到的卡片，避免誤觸丟失成果（但會被 stack 上限淘汰）。

## 3. 使用者流程

### 3.1 觸發「改寫這條 user story」

1. 使用者進入 Stories step。Panel header 顯示「現在你在：User Stories」，列出 3 個 actions。
2. 使用者點「改寫這條 user story」。**不需要 selection**（Wizard 只有單一 story）。
3. `actionRunner` 組 prompt（餵入 `epics[0].stories[0].userStory` 全文 + goal）→ 呼叫 `claudeProvider`。期間若使用者切走 step，Panel 仍跑完（不取消）。
4. 收到結構化回應 → push 一張 `ActionResultCard` 進 result stack：
   - Header：動作名 + 時間戳
   - Body：preview text（改寫後的 userStory 文案）
   - Footer：目標欄位 `epics[0].stories[0].userStory` + `[採用] [丟棄]`
5. 使用者按「採用」→ `useDraftStore.applyActionResult({ targetPath: "epics[0].stories[0].userStory", mode: "replace", value })` → 表單欄位即時更新。

### 3.2 觸發「指出缺哪些角色 / 場景」

1. 使用者點「指出缺哪些角色」。直接執行（不需 selection）。
2. 結果卡片是 **warning card**：列點顯示可能漏掉的項目，每點附 `severity: "info" | "warning"`。
3. Card **沒有「採用」按鈕**，只有「我知道了」（dismiss）。使用者看完依己意手動補進表單，或選別的 action 讓 Panel 起頭。

### 3.3 觸發「跟 goal / criteria 對一下」

跟 §3.2 同形態，唯一差別是：每條 issue 文案會引用相關欄位（例如「Goal 提到『支援匿名訪客』，但 story 要求登入」）。

### 3.4 解析失敗

任何 action 若 `actionRunner` 無法從 Claude 回應中找出合法 JSON 區塊：
- Card 顯示「⚠️ 無法解析回應」+ raw response 全文（折疊在 `<details>` 中）
- 沒有「採用」按鈕，只有「丟棄」與「重試」
- 重試會用同一份 prompt 重跑

## 4. 架構

### 4.1 上層元件結構

```
AppShell
├─ DraftSwitcher / Header
├─ Wizard (主 form 區)
│   └─ steps/StoriesStep.tsx (v1 不需要 selection radio — 單一 story)
└─ WizardActionPanel
    ├─ ActionPanelHeader (顯示當前 step + 狀態文案)
    ├─ ActionMenu (隨 step 渲染 actionRegistry[step])
    └─ ActionResultStack
        └─ ActionResultCard*N
```

### 4.2 資料流

```
Wizard.tsx
  ├─ 持有 currentStepId / activeDraft (既有)
  └─ 透過 useWizardContext provider broadcast:
        { currentStepId, activeDraft }
        (v2 加 selectedItemId / setSelectedItemId — selection 機制延後)

WizardActionPanel
  ├─ 讀 actionRegistry[currentStepId] → 渲染 ActionMenu
  ├─ 點 action → runAction(action, activeDraft)
  │       ↓
  │   POST /api/wizard-action → wizardActionRouteHandler
  │     server-side:
  │       1. 用 action.promptTemplate(draft) 組 prompt
  │       2. claudeProvider.spawnAgent(prompt, { allowedTools: [] })
  │       3. 累積 text → parseActionResult → zod 驗證
  │       4. 回 ActionResult（preview | notes | parse_error | run_error）
  │       ↓
  │   推進 result stack（capped at 5），渲染 ActionResultCard
  └─ Card「採用」→ useDraftStore.applyActionResult({ targetPath, value, mode })
```

### 4.3 Client / Server 分界

`actionRunner` 必須在 server-side 跑（要 spawn `claude` CLI），客戶端的 `WizardActionPanel` 透過新的 API route 觸發：

```
WizardActionPanel (client)
   ↓ POST /api/wizard-action  body: { actionId, locale, draft, selection? }
app/api/wizard-action/route.ts (server)
   ↓ 呼叫 wizardActionRouteHandler.handle(body)
services/localAgent/wizardActionRouteHandler.ts
   ↓ 1. 從 actionRegistry 取出 action 定義
   ↓ 2. 用 promptTemplate 組 prompt
   ↓ 3. claudeProvider.spawnAgent({ prompt, allowedTools: [] })
   ↓ 4. 蒐集 stream → parseActionResult → 驗證
   ↓ 回 JSON: ActionResult
WizardActionPanel (client)
   ↓ push 進 result stack
```

route handler 是純函式（接收 body、回 ActionResult），便於以 `Request` 直接餵測試（同 generateSpecRoute 既有寫法）。

### 4.4 與既有 `claudeProvider` 的關係

- 保留 `parseStreamJsonLine` 解析能力（既有測試覆蓋）
- 新增 `spawnAgent(options: { prompt, allowedTools, signal })`：包裝 spawn，組 CLI args（`--print` / `--output-format stream-json` / `--allowed-tools ""`），回 `Promise<{ text: string; events: AgentEvent[] }>`（一次性，非 stream）
- v1 不再走 `subscribeAssistant` 訂閱模型，改為 actionRunner 一次性 await
- 既有 `/api/agent` 路由 + `agentRouteHandler.ts` + `useLocalAgent` + `assistantBridge` + `chatItem` + `agentSeedPromptBuilder` 因失去所有消費者，全部刪除

## 5. 模組落點

```
app/api/
├─ agent/route.ts                       (砍) AssistantPanel 路徑
└─ wizard-action/route.ts               (新) 委派至 wizardActionRouteHandler

src/features/spec-wizard/
├─ services/localAgent/
│   ├─ actionRegistry.ts                (新)
│   ├─ actionRunner.ts                  (新) 純邏輯，接收 deps（claudeProvider 注入）
│   ├─ actionResult.ts                  (新) schema + parser + zod
│   ├─ wizardActionRouteHandler.ts      (新) route 委派層
│   ├─ promptTemplates/                 (新)
│   │   ├─ storiesRewrite.ts
│   │   ├─ storiesGaps.ts
│   │   └─ storiesConsistency.ts
│   ├─ claudeProvider.ts                (改) 加 spawnAgent({ allowedTools })，移除舊 stream subscribe API
│   ├─ types.ts                         (改) 移除 LocalAgentRequest / AgentEvent 訂閱契約對應；保留 spawn 共享型別
│   ├─ chatItem.ts                      (砍)
│   ├─ assistantBridge.ts               (砍)
│   ├─ agentRouteHandler.ts             (砍)
│   └─ agentSeedPromptBuilder.ts        (砍)
├─ components/
│   ├─ AssistantPanel.tsx               (砍)
│   ├─ WizardActionPanel.tsx            (新)
│   ├─ ActionPanelHeader.tsx            (新)
│   ├─ ActionMenu.tsx                   (新)
│   ├─ ActionResultCard.tsx             (新)
│   ├─ SeedPromptSection.tsx            (改) 移除「送進 panel」按鈕、相關 import 與 state
│   ├─ AppShell.tsx                     (改) 換掛 WizardActionPanel
│   └─ steps/StoriesStep.tsx            (v1 不動 — 單一 story 不需 selection)
├─ hooks/
│   ├─ useWizardContext.ts              (新) provider + hook
│   ├─ useLocalAgent.ts                 (砍)
│   └─ useDraftStore.ts                 (改) 加 applyActionResult action
├─ i18n/
│   └─ dictionaries.ts                  (改) 新增 actionPanel.* keys、移除 assistant.* 中已不再使用的 keys
└─ __tests__/
    ├─ actionRegistry.test.ts                (新)
    ├─ actionRunner.test.ts                  (新) 含 parse_error 路徑
    ├─ actionResult.test.ts                  (新) zod schema 邊界
    ├─ wizardActionPanel.test.tsx            (新) UI 流程
    ├─ applyActionResult.test.ts             (新) draftStore mutation
    ├─ wizardActionRoute.test.ts             (新) route handler 直接以 Request 餵入測試
    ├─ claudeProvider.test.ts                (擴) 補 spawnAgent allowedTools argv 斷言
    ├─ assistantBridge.test.ts               (砍)
    ├─ agentRoute.test.ts                    (砍)
    └─ agentSeedPromptBuilder.test.ts        (砍)
```

## 6. Stories step 動作規格（v1 共 3 個）

> v1 沒有 `stories.draft`（補新 story）— 因現行 StoriesStep UI 是 single-story，沒有可插入新項目的 list。延後 v2 一起做。

### 6.1 `stories.rewrite` — 改寫這條 user story

- **何時可用**：總是可用（單一 story 永遠存在；無 selection 步驟）。
- **輸入給 prompt**：`epics[0].stories[0].userStory` 全文、`epics[0].stories[0].title`、`activeDraft.goal.statement`、`activeDraft.metadata.title`
- **prompt 約束**：
  - 必輸出 `vector-action` fenced JSON
  - JSON 形態：`{ "preview": { "text": "...", "targetPath": "epics[0].stories[0].userStory", "mode": "replace" } }`
  - text 必須是繁體中文（除非 `metadata.locale` 為 `en`）
  - 必須遵循「身為 X，我想要 Y，以便 Z」結構
- **採用行為**：取代 `epics[0].stories[0].userStory`，其他欄位（id、title、acceptanceCriteria、examples）不動

### 6.2 `stories.gaps` — 指出缺哪些角色 / 場景

- **何時可用**：總是可用
- **輸入給 prompt**：goal + 現有 story（`epics[0].stories[0]`）
- **JSON 形態**：`{ "notes": [{ "severity": "info"|"warning", "text": "...", "ref"?: "epics[0].stories[0]" }] }`
- **無採用行為**：純資訊卡片，僅可 dismiss

### 6.3 `stories.consistency` — 跟 goal / criteria 對一下

- **何時可用**：總是可用
- **輸入給 prompt**：goal + 現有 story + 該 story 的 acceptanceCriteria（即使空陣列也照送，prompt 會處理空值）
- **JSON 形態**：同 §6.2
- **無採用行為**：純資訊卡片

## 7. 結果 schema 與 prompt 約定

### 7.1 ActionResult schema

```typescript
type ActionResult =
  | {
      kind: "preview";
      actionId: string;
      preview: {
        text: string;
        targetPath: string;          // "stories" | "stories[id=X]" | "stories[append]"
        mode: "insert" | "replace";
      };
    }
  | {
      kind: "notes";
      actionId: string;
      notes: {
        severity: "info" | "warning";
        text: string;
        ref?: string;                // optional path 指向相關欄位
      }[];
    }
  | {
      kind: "parse_error";
      actionId: string;
      raw: string;
    }
  | {
      kind: "run_error";
      actionId: string;
      message: string;
    };
```

`preview` 與 `notes` 各自用 `zod` schema 定義；`actionResult.ts` 匯出 `parseActionResult(raw: string, actionId: string): ActionResult`。

### 7.2 Prompt 約定

每個 promptTemplate 都以下列尾巴結束：

```
請僅輸出一個 fenced code block，標記為 vector-action，內容為符合下列 schema 的 JSON：

  ```vector-action
  { "preview": { "text": "...", "targetPath": "stories", "mode": "insert" } }
  ```

或者：

  ```vector-action
  { "notes": [{ "severity": "warning", "text": "..." }] }
  ```

不要有其他輸出、不要解釋、不要 markdown。
```

`actionRunner` 對 stream 累積 text，找第一個 ```vector-action fenced 區塊：

- 找到 → JSON.parse → zod 驗證 → 回 `ActionResult`
- 沒找到 / parse 失敗 / zod 失敗 → 回 `kind: "parse_error"`
- spawn 失敗 / non-zero exit → 回 `kind: "run_error"`

## 8. 工具鎖死

`claudeProvider.spawnAgent` 預設組 CLI args 為：

```
claude --print --output-format stream-json --input-format text --allowed-tools ""
```

`--allowed-tools ""` 等於空白允許清單，CLI 會拒絕 Claude 嘗試使用任何工具（先以實際 CLI 行為驗證，必要時改用 `--disallowed-tools` 全列）。

呼叫端可選擇傳 `allowedTools: string[]`；v1 一律傳 `[]`。日後若需要打開特定工具（例如允許 `Read` 看本地草稿檔），改在 actionRegistry 上 per-action 開白名單。

實作驗收：`claudeProvider.test.ts` 必須斷言 spawn 收到的 argv 中含有禁用工具的 flag，且不含開放工具的 flag。

## 9. UI / i18n

### 9.1 Locale

新增 i18n keys（`zh-TW` + `en` 雙寫）：

- `actionPanel.title`
- `actionPanel.empty`（步驟未註冊 actions 時的空狀態文案）
- `actionPanel.running`
- `actionPanel.card.adopt`
- `actionPanel.card.discard`
- `actionPanel.card.dismiss`
- `actionPanel.card.parseError`
- `actionPanel.card.runError`
- `actionPanel.card.retry`
- `actionPanel.actions.stories.rewrite.label`
- `actionPanel.actions.stories.rewrite.help`
- `actionPanel.actions.stories.gaps.label`
- `actionPanel.actions.stories.gaps.help`
- `actionPanel.actions.stories.consistency.label`
- `actionPanel.actions.stories.consistency.help`

> v1 不需要 `actionPanel.selecting.*`、`actionPanel.card.refine`、`actionPanel.actions.stories.draft.*` — 這些隨 selection / 微調 / 補新 story 一起延後。

### 9.2 Result stack 上限

最多 5 張卡片，超過時最舊的自動丟棄。淘汰時不彈確認，但會在 console 留 warning（dev only）。

### 9.3 Panel collapsed 狀態

保留現有「✦ 展開助手」收合按鈕與 `vector-wizard:assistant-collapsed` localStorage key。Panel collapse 時不接受 action 觸發。

## 10. 風險 / 開放問題

1. **Claude CLI 工具鎖死 flag 行為**：`--allowed-tools ""` 對 CLI 是允許 0 個工具還是允許全部？需在實作首段以 spike 確認，不確定就改用 `--disallowed-tools` 列舉禁用集。**驗收條件**：在 `claudeProvider.test.ts` 寫一條真實 spawn 測試（或 mock spawn 後斷言 argv），驗證 Panel 路徑下 Claude 確實無法呼叫 Read / Bash。
2. **JSON 區塊偵測邊界**：Claude 可能輸出嵌套 fenced block 或多個 vector-action block。v1 採「取第一個合法的」，多餘忽略。若實測發現容易漏掉，調整為「合併處理」。
3. **dot-notation path 語法**：v1 只用 `epics[0].stories[0].userStory` 形態（純 numeric index + dot）。`applyActionResult` 的 path parser 須支援 `key`、`[N]`、`.key`、`[N].key` 組合。`stories[id=X]` 等 id 比對形態延後 v2（多 stories UI 一起做）。
4. **API rate / 並發**：v1 actionRunner 單次只跑一個 action（後續觸發 disable Action menu）。多 action 並行留 v2。
5. **i18n 跨 locale 的 prompt 一致性**：prompt template 自身用中文寫，但要求 Claude 依使用者 locale 輸出。實測若 Claude 偏移到中文，需在 prompt 顯式 `output_locale` 變數。

## 11. 後續路徑（v2 起）

1. **多 stories UI + `stories.draft`**：StoriesStep 改成可加 / 刪 / 重排 N 條 stories；同時把 `stories.draft`（補新 story）+ selection 機制（`stories.rewrite` 改成需先選一條）加回 Panel。`applyActionResult` 同時加 `mode: "insert"` 與 `stories[id=X]` path 形態支援。
2. **複製到其他 7 個 step**：以 v1 的 actionRegistry / actionRunner / Card 骨幹為模板，逐 step 設計 actions（Goal / Criteria / Examples / Boundaries / Deliverables / Context / Basic）。
3. **跨 step 一致性 actions**：例如在 Criteria step 提供「對齊 Stories」的雙向檢查。
4. **Action chain**：採用某張卡片後自動觸發後續推薦 action（例如採用一條 user story 後跳「要不要為它生 acceptance criteria？」）。但仍維持「使用者按下才執行」的被動原則 — chain 表現為下一張卡片預設選中，不自動執行。
5. **Action 結果歷史持久化**：result stack 寫進 `localStorage`，跨 session 保留。
6. **整份 Feature 端到端代寫**：把 SeedPromptSection 的「請求 agent draft」流程改為走 actionRegistry 的 `feature.draftAll` action，統一進預覽閘道。
7. **打開特定工具**：例如允許 Panel 讀本機 `feature-seed.json` 來把 vector-pipeline-b 產出的 seed 轉成 Wizard 草稿。
