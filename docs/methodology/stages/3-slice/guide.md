# Slice 操作指南

這份指南帶你完成 Stage 3：Slice。預期投入 90–180 分鐘。完成後你會得到兩份產物：`story-spine.md`（系統層主流程的故事脊，給人看）與 `feature-candidates.json`（feature 候選清單，給下游程式讀）。你不需要懂 sprint planning、不需要寫 SQL，但需要對使用者「從進入到完成」這條路徑有清楚的想像——這一階段的核心是「把能力切成一片一片可獨立交付的小片」。如果某一片切不出來，把不確定的部分回填到 Stage 1 的 `openQuestions`，不要硬切。

## 4 個小步驟一覽

| 步驟 | 時間 | 產出 | 需要的人 |
| ---- | ---- | ---- | -------- |
| 1. 寫主流程故事脊 | 20–40 分鐘 | Story Spine（編號清單） | 你自己 |
| 2. 垂直切片 | 30–60 分鐘 | Feature 候選 draft | 你自己 |
| 3. 標 MoSCoW | 15–30 分鐘 | priority 欄位 | 你自己 |
| 4. （選填）補上分數 | 0–30 分鐘 | WSJF / RICE 註記 | 你自己（有資料時） |
| 5. 畫相依 | 15–20 分鐘 | `dependsOn` DAG | 你自己 |

## 步驟 1：寫主流程故事脊（Story Spine）

從左到右意思是：使用者從「第一次進入系統」一直到「完成今天的主目標」之間，會依序經歷哪些高階故事節點。先把這條主幹寫出來，分支劇情等主幹完成再加。每個節點對應一段「使用者要做的事」，不是 UI 畫面、也不是技術元件。

- **格式**：用 markdown 編號清單（`1.` `2.` `3.` …），每行一個高階故事節點，從進入寫到完成。
- **長度**：5–7 個節點最理想；超過 9 個代表還沒抽象化，少於 4 個代表沒走到主目標。
- **每個節點對應一個 capability**：如果某個節點找不到對應的 `CAP-NNN`，回 Stage 2 補一個 capability，不要硬把節點塞進不相干的 capability。
- **範本**：

  ```markdown
  1. 使用者登入
  2. 看見團隊儀表板
  3. 瀏覽預建 KPI 目錄
  4. 把 KPI 加進儀表板
  5. 自組一份報表
  6. 儲存與分享報表
  ```

寫完後問自己：「如果整條 spine 只能挑一條最短路徑端到端跑通，會是哪幾個節點？」這個答案會在步驟 2 變成 Walking Skeleton。

## 步驟 2：垂直切片（Vertical Slicing + Walking Skeleton）

拿著 story spine，沿著主流程切出垂直片。每片必須符合 INVEST 並且垂直貫穿——前端、後端、資料層都要碰到，使用者真的能用。

**為什麼不可橫切**：橫切是指「先把所有前端做完、再把所有後端做完、最後接資料庫」這種按技術層分組的切法。橫切的問題是中間每一階段都不可交付：完成 100% 的前端但後端還沒接時，使用者看不到任何價值，而且任何一層的設計錯誤都會等到接線時才爆出來，修改成本最高。垂直切片把技術風險前置——第一片就要打通所有層，後面每片在已知能跑的骨架上加肉。

**第一刀必須是 Walking Skeleton**：挑 story spine 中最短的端到端路徑，做出一個極簡但完整的版本。例：登入 → 看到儀表板（哪怕只有空白卡片）。這片標 `must`、`dependsOn` 為空、size 通常是 M。它存在的目的是讓你在第一個 sprint 結束時，就能向使用者展示「系統真的能跑」，並驗證部署、驗證認證、驗證資料層接線都通了。

**每個 feature 必填八欄**：`id`（`FT-NNN`）、`title`、`oneLineGoal`、`linkedCapabilities`、`priority`、`estimatedSize`、`dependsOn`、`rationale`。`oneLineGoal` 寫一句話：誰、做什麼、得到什麼結果，避開「更好／更快／提升」這類含糊形容詞。

## 步驟 3：標 MoSCoW

每個 feature 都要標一個 priority，這是必填規則——沒有「未分類」這個選項。`wont` 也保留下來，是為了顯示「我們有意識地決定不做某些事」，而不是漏掉。

| 等級 | 意義 | 範例 |
| ---- | ---- | ---- |
| `must` | 沒做的話 MVP 跑不起來；Walking Skeleton 一定是 must | 登入、最關鍵的主流程 |
| `should` | 重要但晚一個 sprint 不會死 | 自助式報表組合器 |
| `could` | 加分項，有時間就做 | 報表匯出 PDF |
| `wont` | 已決定這輪不做，留下紀錄避免日後重提 | 客製化主題色 |

每片只能挑一個等級。如果你猶豫某片是 must 還是 should，預設 should——must 越精煉越能反映真實的關鍵路徑。

## 步驟 4（選填）：補上分數

WSJF（Weighted Shortest Job First）與 RICE（Reach, Impact, Confidence, Effort）是兩種常見的量化排序方法。它們用分數比較同一個 priority 桶內的 feature 該誰先做，但都需要可信的輸入：團隊速率、使用者觸及數、商業影響量化。

**沒資料時不要做**：如果你的團隊還沒跑過兩個 sprint、沒有實際使用者數，分數會是「看起來精準的猜測」，反而蓋過直覺。等資料齊了再補。需要補時，分數寫在 `rationale` 裡作為註記，不另設欄位。

## 步驟 5：畫相依

用 `dependsOn` 把 feature 之間的直接前置關係列出來。

- **只列直接前置**：如果 FT-003 依賴 FT-002、FT-002 依賴 FT-001，FT-003 的 `dependsOn` 只寫 `["FT-002"]`，不要把 `FT-001` 也寫進去（遞移由拓撲排序自動處理）。
- **不可形成循環**：FT-A 依賴 FT-B、FT-B 又依賴 FT-A 是錯誤切片。出現循環時回步驟 2 重切。
- **能不依賴就不依賴**：減少相依等於增加並行可能性與排程彈性。

## 完成檢查表

進入 Stage 4 Handoff 之前，逐項打勾：

- [ ] 至少 1 個 `must` feature，且其中一個是 Walking Skeleton（`dependsOn` 為空、貫穿主流程）。
- [ ] 所有 feature 都填齊八個欄位（`id`、`title`、`oneLineGoal`、`linkedCapabilities`、`priority`、`estimatedSize`、`dependsOn`、`rationale`）。
- [ ] 所有 feature id 形如 `FT-NNN`（三位數補零、連續編號）。
- [ ] 所有 `linkedCapabilities` 引用都是 Stage 2 已定義的合法 capability id。
- [ ] `dependsOn` 不形成循環（拓撲排序可成功）。
- [ ] `oneLineGoal` 不含 `better / faster / 更好 / 更快 / 提升` 這類形容詞。

## 常見坑

1. **橫切而非垂直切**：寫了一片叫「KPI 後端 API」、另一片叫「KPI 前端頁面」。這是橫切，使用者拿不到任何完整功能。改成「KPI 目錄 v1（含前後端最小流程）」一片。
2. **Walking Skeleton 太肥**：第一片就想把登入、儀表板、KPI 三件事都打通。Walking Skeleton 的目的是驗證接線，不是交付完整功能；切到極簡，能跑就好。
3. **MoSCoW 全部標 must**：每片看起來都很重要。回去問自己「沒做這片我能不能 demo 給使用者？」如果可以 demo 就不是 must。
4. **`dependsOn` 寫遞移依賴**：把所有上游都列進去。只寫直接前置，遞移依賴由 DAG 自動處理。
5. **沒有資料就硬算 WSJF**：用想像中的速率與觸及數算出 0.74 分。沒資料時別做，先用 MoSCoW + 直覺，等真的有資料再補。
