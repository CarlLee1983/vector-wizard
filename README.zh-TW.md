# Vector Agile Roadmap Wizard

[English](README.md) | 繁體中文

Vector 是一款高密度、專業的技術設計工具，旨在橋接「非技術決策者」與「AI 程式代理人」。它引導用戶完成敏捷路線圖（Agile Roadmap）訪談，並匯出可供 AI 代理人直接讀取的 YAML 功能規格書。

## 🚀 核心功能

- **互動式規格精靈**: 引導式訪談流程，精確捕捉需求、使用者故事（User Stories）與驗收標準（Acceptance Criteria）。
- **AI 導向匯出**: 產出結構化的 YAML 規格書，優化後可供 AI 代理人（如 Claude Code, Cursor, Copilot）高效理解。
- **雙路徑方法論 (Dual-Path Methodology)**:
  - **路徑 A (逆向分析)**: 使用 `vector-analyzer` 將既有程式碼轉化為結構化規格。
  - **路徑 B (正向設計)**: 使用 `vector-pipeline-b` 將原始系統構思轉化為功能種子（Feature Seeds）。
- **AI 助手**: 內建規格品質檢查與完善建議，確保規格書內容完整且無歧義。
- **易讀的 Markdown 摘要**: 匯出整潔的 Markdown 摘要，便於團隊評審。
- **草稿管理**: 自動保存至 `localStorage`，並支援 JSON 格式的匯入與匯出。
- **多語系支援**: 完整支援繁體中文（台灣）與英文。
- **紙感設計系統**: 溫暖且高密度的使用者介面，靈感源自專業技術文件，旨在減少視覺疲勞並提升專注度。

## 🛠 技術棧

- **框架**: Next.js (App Router)
- **語言**: TypeScript
- **運行環境與套件管理**: [Bun](https://bun.sh/)
- **測試**: Vitest + React Testing Library
- **設計**: 自定義 "Vector" 設計系統 (溫暖紙感美學)

## 📦 快速上手

### 前置條件

- 您的機器需安裝 [Bun](https://bun.sh/)。

### 安裝

```bash
bun install
```

### 開發環境

啟動開發伺服器：

```bash
bun run dev
```

在瀏覽器中開啟 [http://localhost:3000](http://localhost:3000) 即可查看結果。

### 建構

```bash
bun run build
```

### 測試

```bash
# 執行所有測試
bun run test

# 以監控模式執行測試
bun run test:watch
```

### 匯入 Pipeline B 的 feature-seed

跑完方法論 Pipeline B 之後，可以一次把整批 seed 匯入 wizard：

```bash
npx vector-wizard import ./docs/methodology/artifacts/seeds/
# 或指定一份或多份檔案
npx vector-wizard import ./seed-a.feature-seed.json ./seed-b.feature-seed.json
```

CLI 會把通過驗證的 draft 寫入 `.vector/import/pending.json`，然後啟動 wizard。首次載入時，wizard 會自動把每份 draft 灌進 Draft Manager，並以 toast 顯示匯入結果。pending 檔案讀完即刪（consume-on-read），重新整理頁面不會造成重複匯入。

## 🏗 專案架構

本專案採用高度自包含的功能模組架構，核心邏輯位於 `src/features/spec-wizard/`：

- **model/**: 定義規範類型 (`FeatureDraft`, `ValidationIssue`) 與驗證規則。
- **services/**: 處理 YAML 序列化、Markdown 摘要與 AI 助手業務邏輯。
- **components/**: 精靈介面、預覽面板與欄位管理等 UI 組件。
- **persistence/**: 本地存儲與 JSON 草稿處理。
- **i18n/**: 基於字典的國際化支援。
- **api/**: 伺服器與客戶端通訊的共用合約（Contracts）。

## 🤖 AI 代理技能

Vector 內附兩大核心技能，協助 AI 代理橋接構思、程式碼與路線圖規格。

### 1. `vector-analyzer` (程式碼 → 規格)
將既有程式碼逆向分析為符合 Vector 規格的 `FeatureDraft` JSON。
- **位置**: `.agents/skills/vector-analyzer/SKILL.md`
- **使用場景**: 當您有程式碼但缺乏文件或路線圖時。

### 2. `vector-pipeline-b` (構思 → 規格)
引導系統構思通過 4 階段流水線：**Frame (框架) → Decompose (分解) → Slice (切片) → Handoff (交付)**。
- **位置**: `.agents/skills/vector-pipeline-b/SKILL.md`
- **使用場景**: 當您從零開始啟動新專案時。

---

### 安裝與設定

把以下提示詞貼進任一 AI 代理（Claude Code、Codex、Cursor 等）的新對話，代理會自動偵測平台並安裝所需技能：

> 請幫我安裝本倉庫的 `vector-analyzer` 與 `vector-pipeline-b` 技能（位於 `.agents/skills/` 目錄）。
>
> 1. 偵測你目前運行於哪個代理平台。
> 2. 若為 Claude Code：把技能目錄複製到 `~/.claude/skills/`。
> 3. 若為其他代理：請告訴我此系統建議的安裝路徑。
> 4. 驗證安裝成功，並印出各個技能在該平台的一行使用提示。

### 遠端安裝 (從 GitHub)

若尚未 clone 本倉庫，請使用以下提示詞：

> 請從 https://github.com/CarlLee1983/vector-wizard 安裝 `vector-analyzer` 與 `vector-pipeline-b` 技能。
>
> 1. 淺層 clone 倉庫至 `/tmp/vector-wizard-skills`。
> 2. 將 `.agents/skills/` 下的技能安裝到我代理的本地技能目錄。
> 3. 清理臨時目錄並驗證安裝。

### 使用範例

**路徑 A (逆向工程):**
> 請使用 `vector-analyzer` 技能分析這個專案，產出一份 `FeatureDraft` JSON，我會把它貼進 `npx vector-wizard` 的 Draft Manager。

**路徑 B (系統設計):**
> 請使用 `vector-pipeline-b` 技能來框架我的系統構思：「我想開發一個 [系統 X]」。請遵循各階段引導，直到我們產出功能種子 JSON 檔案。

## 📄 授權

本專案為內部使用之私有專案。
