# Stage 3：Slice（從能力切到 feature 候選）

Decompose 完成後我們手上有一份 `capability-list.json`，每個 capability 都對應一組 actor、jobs 與 events。但 capability 仍然是「系統能做的事」這個抽象層級，無法直接交給 AI Coding Agent 去實作——它沒有「先做什麼後做什麼」的時序，也沒有「這一刀是 must 還是 could」的取捨。Slice 階段的工作就是把這層「能力」切成可交付的 feature 候選：每個 candidate 是一片垂直的、可端到端測試的小片段，帶 priority、size、dependsOn，準備在 Stage 4 被展開成完整的 feature seed。

## 方法論組合

我們把 Slice 拆成四個小步驟：Story Mapping（系統層主流程）→ INVEST + Walking Skeleton + Vertical Slicing → MoSCoW → Simplified DAG。順序代表上一步是下一步的輸入，不可隨意跳過。

- **Story Mapping（系統層主流程）**：先從左到右畫出使用者「從進入系統到完成主目標」的高階故事脊（story spine），這是 Jeff Patton 提出的 backbone 概念——它的目的不是列出所有功能，而是把骨幹定下來，讓後面切片時有「這片屬於骨幹哪一段」的對照。每個骨幹節點至少要對應一個 Stage 2 的 capability，否則代表 Decompose 還缺一塊。
- **INVEST + Walking Skeleton + Vertical Slicing**：拿著 story spine，沿著主流程切出垂直片。每片必須符合 INVEST（Independent、Negotiable、Valuable、Estimable、Small、Testable）且要垂直貫穿（前端 UI、後端邏輯、資料層都要有），不能橫切成「先做完所有前端再做後端」。第一刀必須是 Walking Skeleton——一個最小但端到端可運作的流程，用來證明所有層的接線都通了。
- **MoSCoW**：把每個 feature 候選標上 must / should / could / wont。這是必填欄位，不是裝飾——它顯式地把「這個 sprint 一定做」「先擱著」「決定不做」分開。Walking Skeleton 一定是 must；wont 也保留下來，是為了顯示「我們有意識地決定不做某些事」，而不是漏掉。
- **Simplified DAG（簡化相依圖）**：用 `dependsOn` 把 feature 之間的直接前置關係列出來，組成有向無環圖。只列直接前置，不列遞移；如果出現循環就代表切片切錯了，必須回 Step 2 重切。

## 為何 MoSCoW 必填、WSJF/RICE 選填

MoSCoW 的訊息密度低（4 個分桶），但即使在零資料情境下也能做有意義的判斷——「這片不做產品就跑不起來」屬於 must，「這片可以晚一個 sprint」屬於 should。它的代價是無法回答「同樣是 must 的兩片，誰先做」這種細節，但對 MVP 階段這個粒度已經夠用。

WSJF（Weighted Shortest Job First）與 RICE（Reach, Impact, Confidence, Effort）這類量化排序則需要可信的歷史速率資料、客戶觸及面估計、與置信度校準。在 Path B 的 MVP 場景下，這些資料根本還沒產生——團隊速率沒跑過，使用者規模還在假設階段。硬要算 WSJF 分數，最後得到的是「看起來很精準的猜測」，反而會壓過直覺判斷，做出比 MoSCoW 更糟的決定。所以我們把 WSJF/RICE 列為選填：等真的有兩個 sprint 的速率資料、有實際使用者反饋之後再補，那時數字才有意義。

## 切片原則

- **垂直可交付**：每片必須能獨立部署到使用者面前並產生可驗證的價值，不可切成「只有後端 API 沒有 UI」這種半成品。
- **INVEST**：Independent（獨立可驗證）、Negotiable（細節可談判）、Valuable（對使用者或業務有價值）、Estimable（可估計工時）、Small（單片不超過 1 個 sprint）、Testable（有明確驗收方式）。
- **Walking Skeleton 第一刀通過所有層**：第一個 must feature 必須端到端打通登入、主流程、資料寫回，哪怕功能極度精簡——目的是先證明「整條管線」可以動，再回頭加肉。
- **單刀不超過 1 個 sprint**：估算 size 落在 S/M/L/XL，超過 XL 就拆。一片如果預估超過 sprint 長度，代表它不夠 small，會在執行時擋住其他片。
- **相依降到最少**：能不依賴別片就不依賴；真的需要依賴時，只列直接前置。減少相依等於增加並行可能性。

## 與下游的對應

`feature-candidates.json` 不是孤立檔案，它的每個 feature 在 Stage 4 都會被展開成一個 feature seed。具體對應方式：每個 feature 的 `id` 與 `title` 會成為 Stage 4 各檔案的 `metadata.title` 來源；`oneLineGoal` 會成為 `goal.statement` 的初稿；`linkedCapabilities` 引用回 Stage 2 的 capability id，用來鎖定這個 feature 的 actor 與 job 範圍。

Priority 在這裡有一道過濾閘：只有 `must` 與 `should` 的 feature 才會在 Stage 4 被轉成 feature seed 進入 Handoff。`could` 與 `wont` 暫不轉成 seed——`could` 留在 backlog 等下一輪回顧，`wont` 則永久保留為「決定不做」的紀錄，不再被誤觸。這條過濾閘讓 Handoff 階段的工作量始終可預測：不會因為 Slice 列了 30 個 feature 就把 30 份 seed 都做出來。

## 進入下一階段的條件

進入 Stage 4 Handoff 之前，用以下條件確認 Slice 真的完成：

- 至少 1 個 priority 為 `must` 的 feature，且其中一個是 Walking Skeleton（依賴為空、貫穿主流程）。
- 所有 feature 都有非空的 `linkedCapabilities`，每個引用都對應到 Stage 2 的合法 capability id（形如 `CAP-NNN`）。
- `dependsOn` 不形成循環——可用拓撲排序檢查；如果排序失敗代表有環，必須拆解。
- 每個 feature 都填齊八個欄位：`id`、`title`、`oneLineGoal`、`linkedCapabilities`、`priority`、`estimatedSize`、`dependsOn`、`rationale`。
