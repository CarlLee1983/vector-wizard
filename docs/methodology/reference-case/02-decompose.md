# Reference Case Stage 2 — Decompose

承接 01-frame.md 已定錨的內部報表平台情境：使用者是 Ops Analyst 與 Finance Lead 兩個 end user 角色。進入 Decompose 之後，我們發現要把「直接從 Snowflake 拉資料」這條路真的打通，必須加上 Data Engineer 作為內部支援角色——他不會用儀表板，但 KPI 目錄與資料管線需要他維護。這份 reference case 示範如何把三個角色、五組 JTBD、七個領域事件歸納成三個 capability，讓 Stage 3 切 feature 時有穩定的種子可用。

## 角色表

| 角色 | 想得到什麼 | 痛點 | 影響力 |
| ---- | ---------- | ---- | ------ |
| Ops Analyst | 每週 KPI 例會前 10 分鐘掌握上週數字 | 每週手動拉試算表 4 小時、找不到舊數字 | 高（直接使用者） |
| Finance Lead | 月度結帳時與 Ops 對齊同一份口徑 | 兩團隊匯總出的數字對不上、檢討會吵架 | 高（直接使用者） |
| Data Engineer | KPI 定義集中、不被臨時 SQL 工單打斷 | 每週收到重複問題、KPI 口徑分散在各個 notebook | 中（非 end user，但是 KPI 目錄的維運者） |

## JTBD 摘要

- Ops Analyst：當每週一早上要交週報時，我想 5 分鐘內看到上週與本週的營收與流失率，這樣我就能準時開會。
- Ops Analyst：當我發現某個 KPI 有趣時，我想直接把它加到自己的儀表板，這樣我就能下次不用重找。
- Finance Lead：當月底結帳時，我想直接看到 Ops 同事用的那份報表，這樣我就能在檢討會用同一份數字討論。
- Finance Lead：當我整理完月度報表時，我想一鍵分享給跨部門同事，這樣我就能省掉手動寄信。
- Data Engineer：當有人要新的 KPI 時，我想在目錄裡集中定義一次，這樣我就能不再被同樣的 SQL 工單打擾。

## 領域事件時間序

- UserAuthenticated
- DashboardViewed
- KPIBrowsed
- KPIAddedToDashboard
- ReportComposed
- ReportSaved
- ReportShared

## 能力清單（capability-list.json）

把上述角色、jobs 與事件歸納後，我們得到三個 capability：登入後的儀表板存取、預先建好的 KPI 目錄、以及自助式報表組合與分享。下面這份 JSON 就是 Stage 3 Slice 會直接讀取的種子資料。

<!-- schema: capability-list -->
```json
{
  "schemaVersion": "0.1",
  "capabilities": [
    {
      "id": "CAP-001",
      "name": "Authenticated dashboard access",
      "description": "授權的內部使用者登入後，看見依其團隊範圍篩選的儀表板。",
      "actors": ["Ops Analyst", "Finance Lead"],
      "jobs": ["登入內部報表平台", "瀏覽我所屬團隊的儀表板"],
      "events": ["UserAuthenticated", "DashboardViewed"]
    },
    {
      "id": "CAP-002",
      "name": "Pre-built KPI catalog",
      "description": "常用 KPI（營收、流失率、庫存週轉）已預先建好，使用者免寫 SQL 即可加入儀表板。",
      "actors": ["Ops Analyst"],
      "jobs": ["瀏覽 KPI 目錄", "把 KPI 加進儀表板"],
      "events": ["KPIBrowsed", "KPIAddedToDashboard"]
    },
    {
      "id": "CAP-003",
      "name": "Self-serve report builder",
      "description": "使用者可由 KPI 元件組合自助式報表，不需工程師協助。",
      "actors": ["Ops Analyst", "Finance Lead"],
      "jobs": ["組合一份報表", "儲存報表", "分享報表"],
      "events": ["ReportComposed", "ReportSaved", "ReportShared"]
    }
  ]
}
```
