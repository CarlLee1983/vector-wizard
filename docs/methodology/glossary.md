# 方法論詞彙表（Glossary）

本表是 Path B 方法論文件群的中英文名詞對照入口：A／B 層敘事文（`methodology.md`、`guide.md`）以繁體中文為主，C 層 `agent-script.md` 與所有 JSON schema／欄位名則使用英文。當你在中文章節看到「故事脊」而下游 schema 出現 `storySpine`，請以這張表查到的對應關係為準。

| 中文 | English | 出處階段 | 一行解釋 |
| --- | --- | --- | --- |
| 系統定錨書 | System Brief | Frame | Stage 1 的 10 欄輸出。 |
| 最危險假設 | Riskiest Assumption | Frame | 我們最害怕被證偽的事。 |
| 開放問題 | Open Question | Frame | 尚未有答案、會影響後續判斷的問題。 |
| 利害關係人圖 | Stakeholder Map | Decompose | 角色 / 利益 / 痛點 / 影響力。 |
| 待完成的工作 | Jobs To Be Done | Decompose | 「當 ___ 時，我想 ___」。 |
| 領域事件風暴 | Event Storming | Decompose | 以時間序列出領域事件；本書採 markdown 變體。 |
| 能力清單 | Capability List | Decompose | 系統可以做哪些事的結構化清單。 |
| 故事脊 | Story Spine | Slice | 主流程的高階步驟。 |
| 垂直切片 | Vertical Slice | Slice | 跨層提供端到端最小價值的切片。 |
| 行走骨架 | Walking Skeleton | Slice | 第一刀貫穿所有層，可運行可測。 |
| 候選 feature | Feature Candidate | Slice | 通過 INVEST 與 MoSCoW 標記的 feature 草稿。 |
| feature 種子 | Feature Seed | Handoff | 部分填妥的 FeatureDraft，貼入 Vector wizard。 |
| INVEST 原則 | INVEST | Slice | Independent / Negotiable / Valuable / Estimable / Small / Testable 的切片自檢清單。 |
| MoSCoW 分級 | MoSCoW | Slice | must / should / could / wont 四桶優先序，本階段必填。 |
| T-shirt 估算 | T-shirt Sizing | Slice | 用 S / M / L / XL 表達相對工時，不換算成小時。 |
| 相依關係圖 | dependsOn DAG | Slice | feature 之間只列直接前置的有向無環圖。 |
| WSJF / RICE 量化排序 | WSJF / RICE | Slice | 同一 priority 桶內的選填細排，需要可信速率與觸及資料才用。 |
