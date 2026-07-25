# 專案歷程與未竟事項

本檔取代 `docs/superpowers/`（8 份 design spec + 11 份 implementation plan，共約 20,000 行）。
那批文件是 2026-04-26 至 2026-05-29 間逐功能產生的設計與逐步執行計畫；**11 個計畫全部已上線**，
其逐步指令與內嵌程式碼已被實際的程式碼與測試取代，留著只會與程式碼分歧。

保留下來的是三類無法從程式碼重建的東西：**為什麼這樣決定**、**還沒做的事**、**尚未解決的矛盾**。

- 行為的真相 → 程式碼與 `src/features/spec-wizard/__tests__/`
- 不變式與工作守則 → [`AGENTS.md`](../AGENTS.md)
- 名詞定義 → [`CONTEXT.md`](../CONTEXT.md)
- 個別重大決策 → [`docs/adr/`](./adr/)
- 方法論本身 → [`docs/methodology/`](./methodology/)

---

## 1. 交付年表

上線日取自 git（各檔首次加入之日），非計畫撰寫日。

| 日期 | 功能 | 現在的真相在哪 |
|------|------|---------------|
| 2026-04-26 | Wizard 骨幹、`FeatureDraft` 模型、自訂 YAML emitter、驗證、mock assist | `components/Wizard.tsx`、`model/`、`services/yamlSerializer.ts` |
| 2026-04-26 | AI 審閱 prompt 複製（純前端，不串 LLM） | `services/reviewPromptBuilder.ts` |
| 2026-04-27 | 多草稿管理：`draftStore` + `useSyncExternalStore`、v1→v2 遷移、毀損備份 | `persistence/draftStore.ts`、`components/DraftManagerModal.tsx` |
| 2026-04-28 | Path B 方法論流水線（Frame→Decompose→Slice→Handoff）+ 4 份 JSON Schema | `docs/methodology/`、`tests/methodology/` |
| 2026-04-28 | Roadmap 欄位 `horizon` / `priority` / `dependsOn`（`schemaVersion` 升至 `0.2`） | `model/specTypes.ts` |
| 2026-04-29 | INVEST / Definition of Ready 警示（非阻擋） | `model/validation.ts` 的 `category: "invest"` |
| 2026-04-29 | RAID 結構化：`id` / `status` / `mitigation` | `model/specTypes.ts` 的 `RaidEntry`、`components/RaidArray.tsx` |
| 2026-04-29 | `successSignals` 結構化（`metric` / `threshold` / `kind`） | `model/specTypes.ts` 的 `SuccessSignal` |
| 2026-04-29 | CLI `npx vector-wizard import` 子命令 | `bin/cli.js`、`bin/lib/` |
| 2026-04-29 | YAML 反向解析（round-trip），走與 JSON 匯入相同的 `normalizeDraft` | `services/yamlParser.ts` |
| 2026-05-04 | Wizard Action Panel：綁 step 的結構化動作，工具鎖死 | `services/localAgent/actionRegistry.ts`、`components/WizardActionPanel.tsx` |
| 2026-05-29 | Codex provider：`VECTOR_AGENT` 切換 claude / codex | `services/localAgent/providers/` |

---

## 2. 值得記住的決策理由

不變式本身寫在 `AGENTS.md`，這裡只記**當初為何這樣選**——這是程式碼看不出來的部分。

**自己寫 YAML emitter，不用 js-yaml。**
產出形狀必須逐字穩定，測試才能對字串斷言；`js-yaml` 的引號與換行策略會隨版本變。
代價是不支援 anchor / 多行字面量 / 註解，換 library 前必須先確認既有測試。

**驗證刻意鬆。**
只有三條阻擋錯誤（缺 `metadata.title`、缺 `goal.statement`、無 user story），其餘全是非阻擋警告。
理由是使用者是非技術決策者，被擋住就不會回來；INVEST 落差要看得見但不能擋路。
阻擋錯誤只擋 YAML 下載，JSON 草稿匯出永遠可用。

**多草稿用 `useSyncExternalStore` 而非 Context。**
store 是純函式，所有不變式（active fallback、v1 遷移、autosave、毀損備份）都集中在
`draftStore.ts` 一處可測；Wizard 從「自己管 state」退化成單純的消費者。

**Action Panel 永不放自由 textarea。**
動作集合封閉、每個動作綁定 step 並鎖死工具集。這不是為了限制使用者，是為了讓 agent 的
輸出可預測、可套用到指定的 dot-notation 路徑上。要加動作就進 `actionRegistry.ts` 註冊。

**設計系統只有一套：紙感。毛玻璃已於 2026-07-25 撤除。**
2026-05-05 的 integrated-ai-assistant 設計曾明文要求 "Modernize with Glassmorphism"，
並實際進了程式碼——`.assistant-panel` 一度是 `rgba(255,255,255,0.85)` + `backdrop-filter: blur(12px)`
＋ 12px 圓角、大投影、`translateX(120%)` 滑入。這與 `DESIGN.md` v0.2.0 的紙感契約直接牴觸，
且外溢造成舊版對外落地頁整頁毛玻璃、還宣稱產品「已從紙感轉化」。

裁決是**回歸 `DESIGN.md`**：面板底改 `var(--background)`、卡片維持 `var(--surface)`，
靠 Surface / Background 色差分層（DESIGN.md §2）；圓角回 `var(--radius)`、投影回
`var(--shadow-card)`、動效改為不透明度淡入（DESIGN.md §4「如翻頁般自然，避免戲劇性滑動」）。
`.assistant-toggle` 的放大與發光一併移除，改用與其他按鈕相同的 hover 處理。
全檔已無 `backdrop-filter` 與 `blur()`。

**Assist 建議的採用／拒絕記錄是純本機的，且刻意不外送。**
`assistService` 的 rewrite 回應打上 `suggestionId`，`WizardActionPanel` 在採用時記
`adopted`、丟棄時記 `rejected`，存 `localStorage`（`persistence/suggestionLog.ts`）。
消費入口是 `getSuggestionStats()`——接受率 = 採用 / (採用 + 拒絕)，供未來接真實 LLM
時校準 prompt。
原提案還要「把 `acceptedSuggestionIds[]` 回傳給 server」，**沒有做**：server 是無狀態
mock，往它送等於寫到虛無，正是該避免的 write-only 反模式。這條鏈唯一「事後補不回來」
的部分是回應上的 `suggestionId`（歷史建議無從回填 id），那個有做；本機記錄隨時可加、
加了也不破壞任何契約。整條鏈受 AGENTS.md「no backend persistence」與對外「資料不離開
你的電腦」承諾約束，因此永遠不會有外送。只有 rewrite 計入；quality_check 沒有可採納的
建議，不進分母。

**`estimatedSize` 沿用 Path B 的名稱與值域，只改大小寫。**
2026-04-28 的 gap 分析原本提案叫 `effort`、值域 `xs`–`xl`，但那份提案早於 Path B 的
`feature-candidates.schema.json` 定案。實際採用的是 `estimatedSize` 與 `s/m/l/xl`：
同一個概念不該有兩個名字，而 `XS` 是 Path B 永遠產不出來的值（方法論只定義
S/M/L/XL，並要求「比 XL 大就先拆」）。大小寫的落差收在兩處：Stage 4 交接時轉小寫
（feature-seed schema 從嚴，只收小寫），而 wizard 的 `normalizeDraft` 大小寫不敏感
作為兜底——就算 agent 漏轉，估算也不會掉在地上。

**Codex provider 保留 `claudeProvider.ts` re-export shim。**
避免既有 import 路徑變動觸發大量測試改動。`selectProvider` 會 `toLowerCase`，
`VECTOR_AGENT` 亂值一律 fallback 回 claude。

**Path B 是固定順序流水線（Approach α），但為模組化（γ）留了路。**
每個 stage 的 `agent-script.md` 只要輸入符合宣告的 schema 就能單獨執行；
schema 命名不綁 stage 順序。跳關與重排是未來能力，不是現在的。

---

## 3. 尚未實作（live backlog）

以下項目在原 gap 分析中明確標為未開始，或在各設計文件中列為 v2 之後。**這是本檔最不可再生的部分。**

### 3.1 產品層

| 項目 | 內容 | 規模 |
|------|------|------|
| 草稿變更歷程 | 每份 draft 無 changelog / edit history。敏捷重視可見的決策軌跡，可在 `localStorage` 另存輕量 `revisionLog` | 中 |

### 3.2 Wizard Action Panel v2 之後

1. **多 stories UI + `stories.draft`**：StoriesStep 可加／刪／重排 N 條 story；`stories.rewrite` 改為需先選一條；`applyActionResult` 加 `mode: "insert"` 與 `stories[id=X]` 路徑形態。
2. **複製到其餘 7 個 step**：以 v1 的 registry / runner / Card 為模板，逐 step 設計動作。
3. **跨 step 一致性動作**：例如 Criteria step 提供「對齊 Stories」的雙向檢查。
4. **Action chain**：採用一張卡後預選下一張推薦動作——但**維持被動原則**，預選不等於自動執行。
5. **動作結果持久化**：result stack 寫進 `localStorage`，跨 session 保留。
6. **整份 feature 端到端代寫**：`SeedPromptSection` 的請求流程改走 `feature.draftAll` 動作，統一進預覽閘道。

### 3.3 多草稿管理的升級路徑

Project 分組（Draft 之上再一層）、跨功能分析、多分頁 `storage` event 同步、Trash + Undo、後端持久化與多人協作。
原設計已確認這些**與現有結構相容**：加 Project 層不需重構 Wizard，多分頁同步是 store 內加 subscriber，軟刪除只是 store mutation 行為改變。

---

## 4. 未解決的矛盾

目前沒有。前兩項（紙感 vs 毛玻璃、估算在交接時蒸發）皆已於 2026-07-25 裁決並落地，
結論記在 §2。

---

## 5. 已經沒有保存價值的部分

原文件中以下內容**刻意不保留**：

- **逐步執行指令**（各 plan 的 `Task N / Step N` 與 checkbox）。11 個計畫中有 10 個的 checkbox
  從未被更新過（全部停在未勾），但功能其實都已上線——checkbox 是失效訊號，不是進度紀錄。
- **內嵌的實作程式碼與測試碼**。程式碼與 `__tests__/` 才是真相，文件裡的副本只會分歧。
- **已兌現的 gap 分析項目**（Roadmap 欄位、INVEST、RAID、successSignals、CLI import、
  YAML round-trip 共 6 項）。它們的結論已寫進 §1 年表與程式碼。
- **已被 §2 涵蓋或已寫進 `AGENTS.md` 的不變式**。
- **當年的 deferred decisions 中已自然定案者**：UI component library（結論：自訂元件，未引入
  shadcn/MUI）、YAML 檔名格式、`agent-script.md` 格式（結論：純 markdown 無 frontmatter）、
  schema 驗證入口（結論：`bun run methodology:validate`）。
- **未定案但已無實際意義者**：內部部署目標（Vercel / Docker / 公司主機）——專案已於
  2026-07 轉為 MIT 公開、以 GitHub Pages 發佈落地頁，本機執行為主，此題失效。
