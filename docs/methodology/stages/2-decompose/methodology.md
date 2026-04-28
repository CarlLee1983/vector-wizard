# Stage 2：Decompose（拆解：角色、領域、能力）

Frame 完成之後，我們手上有一份十欄完整的 `system-brief.md`。但它仍然停留在「系統層級」的描述：使用者是誰、痛點是什麼、賭注在哪裡。如果直接從這一層往下切 feature，討論會立刻卡在「Ops Analyst 點下『新增 KPI』按鈕之後要看到什麼」這種 UI 細節上。原因不是大家不認真，而是缺少兩樣中介層的詞彙——共享的角色定義與時間序的事件鏈。沒有這兩樣，每個人腦中的 feature 圖長得都不一樣，所謂的「對齊」只是各自妥協後的最大公約數。Decompose 階段就是把這層中介詞彙建出來，讓 Stage 3 的 feature 切割有可重複的依據。

## 方法論組合與順序

我們把 Decompose 拆成四個小步驟：Stakeholder Map → JTBD light → Single-developer Event Storming → Capability Map。順序不是隨意的，每一步是下一步的輸入。

- **Stakeholder Map**：先畫出誰會用、誰會被影響。在這一步我們不討論功能，只回答「這個系統的舞台上會出現哪些人」。它的輸入是 Frame 的 `targetUsers`，輸出是一張涵蓋直接使用者、間接受影響者、內部支援角色的角色表。先有這張表，後面三步才知道「動詞的主詞是誰」。如果跳過這步直接寫 jobs，會看到滿頁面 user story 都是「使用者⋯⋯」這種模糊主詞。
- **JTBD light（精簡版 Jobs To Be Done）**：對每個角色問「他想完成什麼工作」。我們刻意不用完整版 JTBD（Outcome-Driven Innovation 那一套訪談法太重，需要客戶訪談），改用一句句型 `When ___ I want to ___ so I can ___`。這一步把角色從「靜態頭銜」轉成「動態目標」，並讓我們在事件序之前先確認方向感正確。順序放在事件之前，是因為先有「為什麼」才不會把事件寫成 UI 操作步驟。
- **Single-developer Event Storming**：把系統會發生的領域事件按時間序列出來。傳統 Event Storming 需要一面牆、一群人、一千張便利貼，在小團隊或單人開發情境下根本跑不起來。我們改用 markdown bullet 紀錄過去式動詞事件（`UserAuthenticated`、`ReportShared`），保留「時間序」與「業務語意」這兩個核心，捨去黏便利貼的儀式。它放在 jobs 之後是為了讓事件有目標可錨定，避免寫成「點擊登入按鈕」這種 UI 動作。
- **Capability Map**：把 jobs 與 events 歸納成 capability。capability 是「系統能為某些 actor 完成某類工作」的最小自洽單位，介於 job（單一目標）與 feature（單一交付）之間。它放在最後是因為它需要前三步的所有素材：角色、目標、事件。每個 capability 必須有 id、name、description、actors、jobs、events 六個欄位才算完成。

## 為何不做工作坊版 Event Storming

Alberto Brandolini 的工作坊版 Event Storming 是非常強的方法，但它預設了三個前提：一面實體或夠大的虛擬牆、一組三到八人的跨職能參與者、半天到兩天的連續時間。在 Path B 這個 MVP 場景裡，這三個前提常常都不成立——我們服務的是內部小團隊與單人開發者，多半是在自己電腦前花一兩個小時把腦中的圖整理出來。硬要套工作坊版，結果會是一個人對著虛擬白板自言自語，產出比直接寫 markdown 還差。所以我們做了明確的取捨：保留「過去式動詞事件」「時間序」「業務語意而非 UI 操作」這三個核心約束，捨去便利貼、群體討論、顏色編碼、bounded context 切分這些必須有人群才能成立的元素。換成 markdown timeline 之後，產物可被 git 版控、可被下游程式讀取，反而比白板照片更貼近 Path B 的需求。如果未來有真正的工作坊場合，再升級到完整版即可，這份 markdown 也能無痛轉成便利貼。

## 產出兩份檔案

Decompose 產出的不是單一檔案，而是刻意分成兩份：`domain-map.md` 與 `capability-list.json`。

`domain-map.md` 是給人看的：上半部敘述為什麼這樣切角色、為什麼事件是這個順序，中間放角色表（角色 / 想得到什麼 / 痛點 / 影響力四欄），下半部放事件時間序。它保留了「為什麼這樣決定」的脈絡，三週後回來看才知道當初的論證。`capability-list.json` 則是給下游程式吃的：純結構化、必填欄位明確、id 形式固定。Stage 3 Slice 會直接讀取這份 JSON 來產生 feature candidates，因此它必須通過 schema 驗證、屬性順序固定、不能夾雜敘述文字。把敘述與結構刻意分開，是因為兩種讀者（人類審閱者 vs. 自動化代理）對同一份內容的需求剛好相反——人類要脈絡，程式要嚴格 schema。塞在同一份檔案會兩邊都妥協。

## 與下游的對應

`capability-list.json` 不是孤立檔案，它的每一筆都會在 Stage 3 變成 feature candidate 的種子。具體對應方式是：Stage 3 產出的 `feature-candidates.json` 中，每個 candidate 帶一個 `linkedCapabilities` 陣列，引用本階段定義的 `CAP-NNN` id。這條連線讓我們在 Stage 4 切完 feature 之後仍能回溯：這個 feature 對應到哪個 capability、那個 capability 又涵蓋哪些 actor 與 job。如果 Stage 3 出現一個沒有任何 capability 可對應的 candidate，那是強烈訊號——要嘛 Decompose 漏了某個 capability，要嘛這個 candidate 不該在這個系統的範圍內。`capabilities[].actors` 也會作為 user story 主詞的官方來源，避免 Stage 4 出現新角色。

## 進入下一階段的條件

進入 Stage 3 Slice 之前，用以下條件確認 Decompose 真的完成：

- 至少 3 個 capability，少於 3 個代表系統還沒被真正拆開。
- 每個 capability 至少有 1 個 actor 與 1 個 job，缺一個就代表這個 capability 沒有真正的歸屬或用途。
- 所有 capability id 形如 `CAP-NNN`（三位數補零、連續編號），確保下游引用穩定。
- `domain-map.md` 的角色表覆蓋了 `system-brief.targetUsers` 的所有角色；新增的內部支援角色須在敘述中明確標註為非 end user。
- 事件時間序至少 5 個事件、且全部以過去式動詞命名。
