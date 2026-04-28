# 方法論手冊（Methodology Handbook）

方法論手冊銜接「我想做某個系統」到 Vector wizard 可消化的 N 個 feature-seed。它是一組文件加 JSON Schema，不含程式邏輯，也不會被 Next.js build 載入。手冊本身負責回答「在進入 Vector wizard 之前，要先把腦中的系統概念整理成什麼形狀」這個問題；wizard 則負責後續逐 feature 的細部對話。兩者透過 `feature-seed.json` 對接，責任邊界明確。

## 三條入路（Path A / B / C）

不同起點需要不同的前處理流程。本手冊在設計上保留三條入路，讓未來能各自展開：

- **Path A — 願景／商業出發**：適合從 Lean Canvas、OKR、Vision Board 之類的商業視角開始的情境。`狀態：MVP 範圍外，延後規劃。`
- **Path B — 系統概念出發**：適合「我大致知道想做一個什麼系統」但還不確定要切哪些 feature 的情境。`狀態：本次 MVP 唯一實作路徑，請見 pipeline-b.md。`
- **Path C — 問題／痛點出發**：適合從用戶痛點、Dual-Track Discovery、Opportunity Solution Tree、Hypothesis Statement 開始的情境。`狀態：MVP 範圍外，延後規劃。`

無論走哪條入路，最終都會收斂到同一份交付格式：一組可貼進 Vector wizard Draft Manager 的 `feature-seed.json`。

## Pipeline 結構

Path B 把「從系統概念到 feature-seed」拆成四個依序執行的階段，前一階段的結構化輸出就是下一階段的輸入：

```
system idea
   │
   ▼
[1] Frame      ──→ system-brief.md
   │
   ▼
[2] Decompose  ──→ domain-map.md + capability-list.json
   │
   ▼
[3] Slice      ──→ feature-candidates.json
   │
   ▼
[4] Handoff    ──→ N × <feature-id>.feature-seed.json
                                 │
                                 ▼
                         Vector wizard Draft Manager
```

Frame 階段沉澱下來的 `successSignals`、`constraints`、`riskiestAssumptions`、`openQuestions` 會一路沿著 pipeline 流到最終的 feature-seed，不需要在後段重新蒐集一次。

## 三層讀者

每個階段的內容會以三種檔名分層呈現，對應三種讀者：

| Layer | 檔名 | 讀者 | 風格 |
|-------|------|------|------|
| A | `methodology.md` | 自己／內部團隊 | 講理論、講為什麼這樣做、講判斷依據 |
| B | `guide.md` | 非技術 stakeholder | 操作步驟 + 填寫範例的 checklist |
| C | `agent-script.md` | AI agent | 結構化 prompt、input/output schema 引用、可重現的步驟 |

同一個方法論議題會在三層之間呼應，但不重複——A 層解釋為什麼，B 層告訴你怎麼做，C 層讓 agent 可以照著跑。

## 語言政策

- A 層與 B 層（`methodology.md`、`guide.md`）以**繁體中文（台灣用語）**撰寫，目的是給人看。
- C 層（`agent-script.md`）以**英文**撰寫，方便不同 AI agent 共用，並與 `.agents/skills/vector-analyzer/SKILL.md` 的語言慣例對齊。
- 所有 JSON Schema 的 property name 一律使用英文；schema description 可雙語。
- 中英文方法論名詞對照（JTBD、capability、event storming 等）統一收錄於 [glossary.md](glossary.md)。

## 目錄索引

`docs/methodology/` 完整展開後會包含以下檔案與目錄：

- [`README.md`](README.md)：方法論手冊入口，說明三條入路、四階段 pipeline 與三層讀者。
- [`pipeline-b.md`](pipeline-b.md)：Path B 的端到端敘事，從系統概念走到 feature-seed。
- [`glossary.md`](glossary.md)：中英文方法論名詞對照表。
- `schemas/`：四份 JSON Schema（`system-brief`、`capability-list`、`feature-candidates`、`feature-seed`），所有階段的結構化輸出都對齊這份規格。
- `stages/1-frame/`：Frame 階段的 A／B／C 三層文件，把系統概念寫成 `system-brief`。
- `stages/2-decompose/`：Decompose 階段，把系統拆成角色、領域語彙與 capability。
- `stages/3-slice/`：Slice 階段，把 capability 切成可優先排序的 feature-candidate。
- `stages/4-handoff/`：Handoff 階段，把 feature-candidate 轉成可貼進 wizard 的 feature-seed。
- `reference-case/`：以一個內部報表平台為例，逐階段示範產出長什麼樣子。

## 與 Vector wizard 的關係

方法論手冊與 Vector wizard 是兩個獨立模組，透過**檔案層級的複製貼上**串接：手冊在第 4 階段產出 N 份 `<feature-id>.feature-seed.json`，使用者把這些 JSON 直接貼進 wizard 的 Draft Manager，每一份就成為一個 `FeatureDraft`。`feature-seed` 的 `schemaVersion` 對齊 wizard 目前的 `"0.1"`，wizard schema 升版時手冊也要同步調整。手冊只負責填到 `metadata`、`goal.statement`、初步的 `impacts` 和 user story 標題；acceptance criteria、examples 與所有假設的人類確認都留在 wizard 內完成，符合「AI 非權威」的設計約束。
