# Pipeline B：從系統概念到 feature-seed

Pipeline B 是這份方法論手冊唯一在 MVP 範圍內實作的路徑。它服務的是「我已經對想做的系統有粗略概念，但還不知道要怎麼把它切成 feature 給 Vector wizard 接手」這個具體場景。整條 pipeline 的責任邊界很清楚：起點是腦中的系統雛形，終點是一組可以直接貼進 Vector wizard Draft Manager 的 `feature-seed.json`。中間不碰商業願景論證（那是 Path A 的事），也不從用戶痛點開始追溯（那是 Path C 的事）。

## 何時走 Path B

當你符合以下任一條件時，Path B 通常是最省力的入路：

- 你已經對「這個系統大概是什麼」有雛形概念，講得出一句話描述，但還沒寫下來。
- 你不確定要把這個系統切成哪些 feature 才合理，怕切得太大進不了 sprint，也怕切得太細失去整體性。
- 你想用 AI 協助整理結構，但希望保留人類判斷——AI 提建議、寫初稿，你決定要不要採用、哪些需要再補。

如果你還沒到「有系統雛形」這一步，停一下，把概念講清楚再進來。如果你的起點是商業假設或用戶痛點，先在筆記裡跑一輪你自己的前處理，產出一段能塞進 Frame 階段 `oneLiner` 的描述，再回來走 Pipeline B。

## 四個階段一覽

| 階段 | 目標 | 主要產出 | 對應 Vector 欄位 |
|------|------|----------|------------------|
| 1. Frame | 在進入拆解之前，把系統概念寫成可被引用的文字 | `system-brief.md` | seeds for `summary`、`goal`、`agentBoundaries` |
| 2. Decompose | 把已 framed 的系統拆成角色、領域語彙與 capability | `domain-map.md` + `capability-list.json` | source for `actors`、`deliverables` |
| 3. Slice | 把 capability 切成可優先排序、有依賴關係的 feature 候選 | `feature-candidates.json` | 每一列對應 wizard 的一個 feature |
| 4. Handoff | 把 feature 候選轉成 wizard 可消化的部分填好 draft | N × `<feature-id>.feature-seed.json` | 整個 `FeatureDraft` 的局部 |

四個階段是嚴格序列關係：前一階段的結構化輸出是下一階段的必要輸入。跳階執行幾乎一定會在 Slice 或 Handoff 撞牆，因為缺少前面累積的角色、capability、successSignals 等基礎。

## 階段間如何銜接

Pipeline B 的設計重點之一，是讓 Frame 階段沉澱的判斷一路流到最終的 feature-seed，不要讓使用者在每個階段重新回答同一組問題。具體來說：`system-brief` 裡的 `successSignals` 會作為 Slice 階段排優先順序的依據，並在 Handoff 階段被原樣帶進每一個 feature-seed 的成功訊號欄位；`constraints` 會跟著進到 wizard 的 `agentBoundaries.constraints`，提醒後續實作時要受哪些技術／法務／預算限制；`riskiestAssumptions` 在 Decompose 與 Slice 階段是優先級判斷的紅旗，到 Handoff 階段轉為 wizard 的 `risks`；`openQuestions` 則一路被保留——Frame 階段沒答案的問題，到 Handoff 階段仍然以 `openQuestions` 的形式留給人類在 wizard 裡確認。整條 pipeline 不會主動「補全」這些開放問題，而是讓它們可被追蹤。

從 v0.2 起，Slice 階段在 `feature-candidates.json` 排出的 `priority`、`dependsOn` 與 feature `id`，會在 Handoff 階段一併寫入每份 `feature-seed.json` 的 `metadata` 區塊：

| feature-candidates 欄位 | feature-seed.metadata 對應欄位 | 說明 |
|------------------------|-------------------------------|------|
| `id` (FT-XXX) | `id` | 保留追溯，wizard 內可顯示與編輯 |
| `priority` (must/should/could/wont) | `priority` | MoSCoW 優先級原樣帶下游 |
| `dependsOn` (FT-XXX 陣列) | `dependsOn` | 依賴關係原樣帶下游 |
| _（Slice 階段新判斷）_ | `horizon` (now/next/later) | 由執行者在 Slice 結尾或 Handoff 開始時依 priority 決定預設值；`must→now`、`should→next`、其他→`later` 可作為起始建議，但不強制。 |

這四個欄位在 wizard 是選填的，未填時 YAML 會省略對應 key。Pipeline B 跑完之後若這幾個值都沒填，wizard 仍可正常運作，只是失去跨 feature 的排序資訊。

## 跑完整段大概多久

以單一開發者、中等熟悉度的情境作為基準：

- **Frame：1–2 小時。** 寫 `oneLiner`、列 problem／nonProblem、識別 successSignals 與 riskiestAssumptions，不該追求完美，能抓到 70% 就往下走。
- **Decompose：2–4 小時。** stakeholder map 與 JTBD 通常很快，比較花時間的是 domain event 的時序整理與 capability 的命名統一。
- **Slice：2–3 小時。** Story Spine 拉主線約半小時，剩下時間都在跑 INVEST／Walking Skeleton 切分與 MoSCoW 排序。
- **Handoff：30 分鐘 – 1 小時。** 主要是針對 Must／Should 的 feature 跑 LLM 轉換、做 lint、輸出 JSON。

整條 pipeline 約 6–10 小時可完成第一輪。若中途發現需要回溯（見下節），預留多一倍時間。團隊作業會更快——Decompose 與 Slice 適合多人協作。

## 失敗與重來

Pipeline B 不是線性瀑布。下列情況請主動回溯到上游階段，不要硬撐：

- **Decompose 階段發現 `riskiestAssumptions` 有變動**：例如把某個技術假設拆解後，發現它其實是兩個獨立的假設，回到 Frame 修 `system-brief`，不要在 capability 層硬拼湊。
- **Slice 階段切不出合理大小的 feature**：通常代表 Decompose 的 capability 顆粒度不對，capability 太大或太細都會讓 INVEST 的 Small 性質失守，回到 Stage 2 重新切。
- **Handoff 階段發現某 feature 缺少對應的 capability 或角色**：表示 Decompose 階段有遺漏，回到 Stage 2 補完之後再產 seed。
- **`successSignals` 變得難以量測**：通常代表 Frame 階段對使用者場景的認知還不夠，回到 Stage 1 把 `targetUsers` 與場景補清楚。

每次回溯都記得更新對應檔案的時間戳，下游階段才知道要重跑一次。

## 進入下一步：Vector wizard

Pipeline B 跑完之後，你手上會有 N 份 `<feature-id>.feature-seed.json`。從這裡進入 Vector wizard 的步驟：

1. 在專案目錄執行 `npx vector-wizard import <資料夾或檔案路徑>` 一次性 stage 所有 seed，例如 `npx vector-wizard import ./docs/methodology/artifacts/seeds/`。CLI 會把通過驗證的 seed 寫入 `.vector/import/pending.json`，再啟動本地 wizard。
2. 開啟瀏覽器到 wizard 預設網址（通常為 `http://localhost:3000`）。首次載入時，`StagedImportToast` 會顯示成功匯入的份數，每份 seed 對應 Draft Manager 內的一份 `FeatureDraft`。若你只想單獨匯入一份，仍可如過往使用 Draft Manager 的「貼上 JSON」或檔案選擇。
3. 在 wizard 內補完 acceptance criteria、examples，並逐一確認 `openQuestions` 與假設。
4. 確認 BasicStep 的「Roadmap」區塊：若這份 draft 由 Pipeline B 產生，`id`、`priority`、`dependsOn` 應已預填；可視需要調整 `horizon`，或補上 Slice 階段未決定的欄位。
5. 透過 wizard 的 Generate Spec 匯出最終 YAML，交給後續 AI coding agent。

Wizard 的詳細指令、開發環境設定與不可違反的設計約束（例如 AI 非權威、YAML key 一律英文）寫在 [`AGENTS.md`](../../AGENTS.md)。在動手改任何手冊內容、schema 或 wizard 對接邏輯之前，先讀過 `AGENTS.md` 與 `docs/superpowers/specs/2026-04-26-agile-roadmap-wizard-design.md`，避免破壞既有約束。
