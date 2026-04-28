# Reference Case Stage 4 — Handoff

承接 03-slice.md 已切出的三個 feature 候選（FT-001 SSO 一鍵登入、FT-002 預建 KPI 目錄 v1、FT-003 自助式報表組合器 MVP），這一階段把 priority 為 `must` 與 `should` 的候選分別轉成 `*.feature-seed.json`。每一份 seed 都已通過 `feature-seed.schema.json` 結構驗證與 wizard `validateDraft` 不阻擋雙重檢查，可直接貼進 `npx vector-wizard` 的 Draft Manager。

## 我們選了誰

- **FT-001 SSO 一鍵登入**（priority: `must`）：產出 `FT-001-sso-signin.feature-seed.json`，作為 Walking Skeleton 的 seed。
- **FT-002 預建 KPI 目錄 v1**（priority: `must`）：產出 `FT-002-kpi-catalog.feature-seed.json`，驗證最危險假設的 seed。
- **FT-003 自助式報表組合器 MVP**（priority: `should`）：本範例略過，作為「示範範圍取捨」的紀錄；正式跑時這片 should 也會一併產出 seed，命名為 `FT-003-self-serve-report-builder.feature-seed.json`。

略過 FT-003 不是因為它不重要，而是因為 reference case 的目的是讓讀者能在 5 分鐘內看完一份完整 must 範例；多放一份 should 不會增加新的學習價值，反而稀釋焦點。實務上不要省略——這是「示範用」與「真的跑」之間的差異。

## 檔案索引

- [`FT-001-sso-signin.feature-seed.json`](./FT-001-sso-signin.feature-seed.json)
- [`FT-002-kpi-catalog.feature-seed.json`](./FT-002-kpi-catalog.feature-seed.json)

## 怎麼貼進 wizard

三個步驟跑通匯入：

1. 啟動 wizard：`bun run dev`（本地開發）或 `npx vector-wizard`（直接執行已發佈的版本）。
2. 進入 Draft Manager 分頁。
3. 按下「Paste JSON」按鈕，把任一 `*.feature-seed.json` 的整段內容貼進去。匯入成功後 wizard 會跳到 Wizard 主流程，在那裡手動補 `acceptanceCriteria` 與 `examples`。
