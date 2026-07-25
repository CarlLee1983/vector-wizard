# Vector

Vector 把非技術決策者腦中的想法，轉成 AI coding agent 能直接執行的 YAML 功能規格。

本檔是**產品層**的詞彙表：定義 Vector 這個工具本身的名詞。Path B 方法論文件群另有一份中英對照表，見 [`docs/methodology/glossary.md`](./docs/methodology/glossary.md)。

> 詞彙一律以英文為正名（匯出的 YAML key 永遠是英文），中文僅為說明。

## 規格的三種型態

**Feature Draft**：
使用者在 Wizard 中編輯的結構化草稿，是前端唯一操作的對象。
_Avoid_: Spec（未匯出前不叫 Spec）、Form data、Draft object

**Feature Spec**：
Feature Draft 匯出後產生的 YAML 文件，交給 AI coding agent 執行。與 Feature Draft 是**兩套不同的 schema**。
_Avoid_: Spec file、Output、規格書、YAML draft

**Feature Seed**：
Path B 流水線產出、只填了一部分的 Feature Draft，用來貼進 Draft Manager 當起點。是 Feature Draft 的**未完成狀態**，不是另一種資料。
_Avoid_: Seed spec、Template、Starter draft

## 規格的內容

**Goal**：
這個 feature 要達成的單一句陳述。每份 Feature Draft 只有一個 Goal。
_Avoid_: Objective、Vision、目的

**Success Signal**：
判斷 Goal 是否達成的可觀察訊號，可附 metric 與 threshold。
_Avoid_: KPI、Metric（metric 是 Success Signal 的一個欄位，不是它的同義詞）、Success criteria

**Impact**：
某個 actor 因為這個 feature 而產生的行為改變。
_Avoid_: Benefit、Value、效益

**Deliverable**：
為了達成 Goal 而必須被做出來的具體產物。
_Avoid_: Feature、Component、Artifact

**User Activity**：
actor 在系統中實際執行的活動，是 User Story 的上游。
_Avoid_: Task、Use case、Journey

**Epic**：
一組相關 User Story 的容器。Vector 的 Epic 只有標題與底下的 stories，沒有自己的驗收條件。
_Avoid_: Theme、Initiative、Module

**User Story**：
「身為 ⟨actor⟩，我希望 ⟨能力⟩，這樣就 ⟨價值⟩」形式的需求陳述。
_Avoid_: Requirement、Ticket、需求

**Acceptance Criterion**：
判定單一 User Story 是否完成的可驗證條件。縮寫 AC。
_Avoid_: Test case、DoD、驗收測試

**Example Scenario**：
把 Acceptance Criterion 具體化的例子，格式為 given-when-then 或自然語言。
_Avoid_: Test、Gherkin、BDD scenario

## Agent 邊界

**Agent Boundaries**：
Feature Draft 中專門寫給 AI coding agent 看的那一組欄位（non-goals、constraints、test expectations、RAID）。匯出後成為 YAML 的 `agentSpec`。
_Avoid_: Guardrails、Agent config、Instructions

**Non-Goal**：
明確排除在這個 feature 範圍外的事。
_Avoid_: Out of scope（作為名詞時）、Exclusion

**Constraint**：
實作時不可違反的限制。
_Avoid_: Rule、Requirement、Restriction

**RAID**：
Risks / Assumptions / Issues / Dependencies 的統稱。Vector 目前具體記錄的是 **Risk** 與 **Open Question** 兩類，各自帶 status 與 mitigation。
_Avoid_: 把 RAID 當成單一欄位名稱使用

**Open Question**：
尚無答案、會影響實作判斷的問題。它是 RAID 的一類，不是 warning。
_Avoid_: TODO、Unknown、疑問

## 工具與流程

**Wizard**：
引導使用者逐步填完 Feature Draft 的訪談式介面，是 Vector 的主畫面。
_Avoid_: Form、Editor、SpecWizard

**Draft Manager**：
管理多份 Feature Draft 的介面，負責建立、切換、匯入、匯出。
_Avoid_: Draft list、Project manager、Storage

**Suggestion Outcome**：
使用者對一則 AI rewrite 建議的終局反應：`adopted`（採用）或 `rejected`（丟棄）。以建議的 `suggestionId` 為鍵，純本機記在 `localStorage`，用來算接受率、校準未來的真實 LLM。只有 rewrite 有；quality_check 不是可採納的建議，不計入。
_Avoid_: Feedback、Telemetry、Rating（都暗示外送或評分，本記錄兩者皆非）

**Wizard Action**：
綁定在某個 Wizard step 上、由 AI agent 執行的結構化動作（例如改寫 story、找缺口）。動作集合是封閉的，使用者不能自由輸入 prompt。
_Avoid_: Prompt、Command、AI chat、Assist

**Agent Provider**：
實際跑 Wizard Action 的本機 CLI agent。目前有 `claude` 與 `codex` 兩種，以 `VECTOR_AGENT` 環境變數選擇。
_Avoid_: Model、Backend、LLM、Adapter

**Path A**：
從既有程式碼逆向產生 Feature Draft 的流程，由 `vector-analyzer` skill 執行。
_Avoid_: Reverse mode、Analyzer path、逆向工程

**Path B**：
從系統構想正向產生 Feature Seed 的四階段流水線（Frame → Decompose → Slice → Handoff），由 `vector-pipeline-b` skill 執行。
_Avoid_: Forward mode、Pipeline path、方法論

**Horizon**：
這個 feature 落在哪個時間視野：`now` / `next` / `later`。
_Avoid_: Timeline、Phase、Sprint

**Priority**：
MoSCoW 分級：`must` / `should` / `could` / `wont`。
_Avoid_: Severity、Importance、P0/P1

**Estimated Size**：
T-shirt 相對工時：`s` / `m` / `l` / `xl`，不換算成小時。比 XL 還大的切片應先拆，因此沒有更大的尺碼，也沒有 XS。Path B 的 Stage 3 用大寫 `S`/`M`/`L`/`XL`，在 Handoff 交接時轉為小寫。
_Avoid_: Effort、Story Point、Estimate、工時
