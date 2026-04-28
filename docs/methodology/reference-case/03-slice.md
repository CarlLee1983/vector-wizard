# Reference Case Stage 3 — Slice

承接 02-decompose.md 已歸納出的三個 capability：登入後的儀表板存取（CAP-001）、預先建好的 KPI 目錄（CAP-002）、以及自助式報表組合與分享（CAP-003）。Slice 階段把這些 capability 沿著使用者主流程切成可獨立交付的 feature 候選——第一刀 SSO 登入是 Walking Skeleton，第二刀建在第一刀之上，第三刀則明確標為 should，等核心採用之後再開。下面這份 reference case 同時呈現 story spine 與對應的 feature candidates，作為 Stage 4 Handoff 的種子來源。

## Story Spine

1. 使用者透過企業 SSO 登入內部報表平台
2. 看見依其團隊範圍篩選的儀表板
3. 瀏覽預建 KPI 目錄
4. 把選中的 KPI 加進儀表板
5. 自組一份可儲存的報表
6. 儲存與分享報表給跨部門同事

## Feature Candidates

把上述 spine 沿著主流程切成三片：FT-001 是 Walking Skeleton，先打通登入到儀表板的最短路徑；FT-002 在登入可用之後展開 KPI 目錄（驗證最關鍵的假設）；FT-003 是 should 等級的自助式報表組合器，等 KPI 採用率上來再開。

<!-- schema: feature-candidates -->
```json
{
  "schemaVersion": "0.1",
  "features": [
    {
      "id": "FT-001",
      "title": "SSO 一鍵登入",
      "oneLineGoal": "內部使用者透過企業 SSO 登入並抵達個人化儀表板。",
      "linkedCapabilities": ["CAP-001"],
      "priority": "must",
      "estimatedSize": "M",
      "dependsOn": [],
      "rationale": "Walking Skeleton：在登入未通之前其他 feature 無法測。"
    },
    {
      "id": "FT-002",
      "title": "預建 KPI 目錄 v1",
      "oneLineGoal": "Ops Analyst 從 10 個基準 KPI 中挑選並加進儀表板。",
      "linkedCapabilities": ["CAP-002"],
      "priority": "must",
      "estimatedSize": "L",
      "dependsOn": ["FT-001"],
      "rationale": "驗證最危險假設：預建 KPI 能否覆蓋 70% 週報需求。"
    },
    {
      "id": "FT-003",
      "title": "自助式報表組合器 MVP",
      "oneLineGoal": "使用者由現有 KPI 組合一份可儲存的報表，不需寫 SQL。",
      "linkedCapabilities": ["CAP-003"],
      "priority": "should",
      "estimatedSize": "XL",
      "dependsOn": ["FT-002"],
      "rationale": "與試算表的差異化主要在這裡，但要等 KPI 目錄被採用後再開。"
    }
  ]
}
```
