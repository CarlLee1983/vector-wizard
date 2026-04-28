# Reference Case：內部報表平台

本資料夾示範同一個系統在 Path B 四個階段裡長什麼樣子。我們刻意挑「公司內部報表平台」當題目，原因是這個情境在多數公司裡都存在、領域特殊度低、不會牽動商業敏感資訊，跨團隊讀者都能在 5 分鐘內進入狀況；同時它又有足夠多的角色（Ops、Finance、IT、Compliance）讓 Stage 2 的 Decompose 真的需要切分能力，不會退化成單人玩具。把這份案例當作完成度的下限——你的真實專案產出應該至少跟這份一樣具體、一樣誠實，但場景與限制當然會不同。

## 場景設定

- 公司有兩個重度報表使用者：Ops 與 Finance。
- Ops 每週手動從 Snowflake 匯出 CSV、貼進 Google Sheet、再貼進週會簡報；單次流程約耗 4 小時。
- Finance 每月結帳時做相同的事，但口徑不一樣，導致月度檢討時 Ops 與 Finance 的數字常常對不上。
- IT 已建好 Snowflake 倉儲，但目前沒有自助式報表工具；既有 BI 工具被內部退役。
- Compliance 要求所有對外資訊不得包含原始 PII，內部儀表板亦同。
- 預算允許三季內上線一個內部用 web 平台，不允許開放給外部客戶。

## 階段索引

- [`01-frame.md`](./01-frame.md) — Stage 1 Frame：完成的 `system-brief`。
- [`02-decompose.md`](./02-decompose.md) — Stage 2 Decompose：能力清單 `capability-list`。
- [`03-slice.md`](./03-slice.md) — Stage 3 Slice：feature 候選清單 `feature-candidates`。
- [`04-handoff/`](./04-handoff/) — Stage 4 Handoff：每一個 feature 對應一份可貼進 `npx vector-wizard` 的 `feature-seed.json`。

## 如何使用本範例

逐階段讀：把 `stages/N-*/guide.md` 與 `reference-case/0N-*.md` 並排打開，左邊是教學、右邊是已完成範例，一邊讀一邊對照自己的專案應該寫到什麼粒度。先讀完 Stage 1 再進 Stage 2，不要跳。

直接套用 handoff：`04-handoff/` 裡的每一份 `*.feature-seed.json` 都已通過 schema 驗證與 wizard `validateDraft` 雙重檢查，可以直接貼進 `npx vector-wizard` 的 Draft Manager UI 體驗匯入流程，看看從一份 seed 變成 YAML 的最後一哩路。

把它當下限不是模板：reference case 是「達到這個品質才算完成」的參考線，不是「照抄填空」的模板。你真實專案的角色、限制、風險都會不同；如果你的 `riskiestAssumptions` 看起來跟我們的一模一樣，幾乎可以確定你寫的是儀式而不是賭注。
