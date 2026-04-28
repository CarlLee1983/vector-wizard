# Decompose 操作指南

這份指南帶你完成 Stage 2：Decompose。預期投入 90–180 分鐘。完成後你會得到兩份檔案：`domain-map.md`（角色表 + 事件時間序，給人讀）與 `capability-list.json`（能力清單，給下游程式讀）。你不需要懂 DDD、不需要主持工作坊，但需要對系統的使用情境有一定的想像力——這一階段的核心是「把腦中模糊的『誰會做什麼』講清楚」。如果某一步真的卡住，把不確定的部分回填到 Stage 1 的 `openQuestions`，不要硬填。

## 4 個小步驟一覽

| 步驟 | 時間 | 產出 | 需要的人 |
| ---- | ---- | ---- | -------- |
| 1. 找出誰會用 | 20–30 分鐘 | Stakeholder 表 | 你自己（必要時找一位熟悉業務的人 review） |
| 2. 列出每個角色想完成的事 | 20–40 分鐘 | JTBD 句子清單 | 你自己 |
| 3. 把事件按時間序寫下來 | 30–60 分鐘 | Markdown 事件時間序 | 你自己 |
| 4. 歸納成 Capability | 20–50 分鐘 | `capability-list.json` | 你自己 |

## 步驟 1：找出誰會用

- **要做什麼**：畫一張 stakeholder 表，把所有會出現在系統舞台上的人列出來——直接使用者、間接受影響者、必要的內部支援角色（資料工程師、平台維運等）都算。`system-brief.targetUsers` 是起點，不是終點。
- **範本表格**：

  | 角色 | 想得到什麼 | 痛點 | 影響力 |
  | ---- | ---------- | ---- | ------ |
  | （角色名稱） | （他做完事希望帶走什麼） | （目前最痛的事） | （高/中/低 — 對系統決策的影響程度） |

- **範例填法**：
  - `Ops Analyst | 看到本週 KPI 與上週的對比，10 分鐘內回完信 | 每週手動拉表 4 小時 | 高（直接使用者）`
- **常見坑**：把「老闆」當成 stakeholder 但其實老闆只看月報——這時候應該寫成 Finance Lead 的延伸需求，不要新增「CEO」角色把表撐胖。

## 步驟 2：列出每個角色想完成的事（JTBD 精簡版）

我們不做完整版 Jobs To Be Done 訪談，改用一句句型把每個角色的目標寫下來。每個角色 1–3 句即可。

- **句型**：
  - en：`When ___ I want to ___ so I can ___`
  - zh-TW：`當 ___ 時，我想 ___，這樣我就能 ___`
- **範例**：「當每週一早上要交報告時，我想 5 分鐘看到上週的營收與流失率，這樣我就能準時開會。」

JTBD 的重點是「為什麼」而不是「怎麼做」——避免寫成「點選 KPI 按鈕」這種 UI 動作。

## 步驟 3：把事件按時間序寫下來（Markdown 版 Event Storming）

把系統會發生的領域事件按時間順序列在 markdown bullet 裡。事件名稱用過去式動詞，例如 `UserAuthenticated`、`ReportShared`。不需要便利貼、不需要白板，純 markdown 就好——這樣產物可被 git 版控，下游程式也能直接讀取。

### 格式

- 每個 bullet 一個事件，用 PascalCase 過去式動詞命名。
- 事件之間的順序代表時間先後，不代表 UI 跳轉。
- 一條 timeline 5–15 個事件最理想；超過代表還沒做歸納，少於代表還沒切夠。

### 寫法提示

- 從「使用者第一次接觸系統」寫到「使用者完成今天要做的事」這條主幹開始；分支劇情等主幹完成再加。
- 卡住時問自己：「這之後系統的狀態變了什麼？」如果答不出來，那它不是領域事件，是 UI 動作。

## 步驟 4：歸納成 Capability

最後一步把 jobs 與 events 合併成 capability。Capability 是「系統能為某些 actor 完成某類工作」的最小自洽單位，介於 job（單一目標）與 feature（單一交付）之間。

每個 capability 必填六個欄位：

- `id`：形如 `CAP-001` 的三位數補零編號。
- `name`：英文短語、用能力描述（不是 UI 名稱）。例如 `Self-serve report builder` 而不是 `Report page`。
- `description`：1–2 句中文敘述，講「這個能力能為誰做到什麼」。
- `actors`：來自步驟 1 的角色名稱陣列。
- `jobs`：來自步驟 2 的 JTBD 句子（可以縮短）。
- `events`：來自步驟 3 的事件名稱陣列，順序保留時間序。

合併原則：把屬於同一個目的的 jobs+events 收成一個 capability。如果一個 capability 跨太多 actor 或事件，拆成兩個；如果一個 capability 只有一個事件，思考它是否該被併進相鄰的 capability。

## 完成檢查表

進入 Stage 3 Slice 之前，逐項打勾：

- [ ] 至少 3 個 capability，少於 3 個代表系統還沒被真正拆開。
- [ ] 每個 capability 都填齊六個欄位（id、name、description、actors、jobs、events）。
- [ ] 所有 capability id 形如 `CAP-NNN`（三位數補零、連續編號）。
- [ ] `domain-map.md` 的角色表覆蓋 `system-brief.targetUsers` 的所有角色。
- [ ] 內部支援角色（資料工程師、維運）已在敘述中標註為「非 end user」。
- [ ] 事件時間序至少 5 個事件，全部以過去式動詞命名。
- [ ] 每個 capability 的 actors 都能在角色表中找到對應條目，沒有「憑空冒出來的角色」。

## 常見坑

1. **`actors` 與 `system-brief.targetUsers` 不一致**：Stage 2 不可以發明新的 end user 角色；要新增，請回 Stage 1 修改 `targetUsers` 並同步更新 `system-brief`。內部支援角色（如 Data Engineer）可以加，但要在敘述中明確標註。
2. **Capability 名稱用實作名詞而非能力動詞**：`Login Page`、`KPI Table` 這種是 UI 元件而不是能力。改成 `Authenticated dashboard access`、`Pre-built KPI catalog` 這種能力描述。
3. **Events 寫成 UI 動作而非業務事件**：`ButtonClicked`、`ModalOpened` 屬於 UI 行為，不是領域事件。改成「這之後系統狀態變了什麼」的回答，例如 `ReportShared`、`KPIAddedToDashboard`。
4. **JTBD 寫成功能描述**：「我想要一個搜尋框」不是 JTBD。改用句型寫成「當我找不到上週某個 KPI 時，我想 30 秒內定位它，這樣我就能繼續寫週報」。
5. **Capability 太大或太小**：一個 capability 涵蓋全系統（例如 `Reporting`）等於沒切；只涵蓋單一按鈕（例如 `Save Button`）則是 feature 等級。理想的 capability 大小是「2–4 個 jobs + 2–5 個 events」。
