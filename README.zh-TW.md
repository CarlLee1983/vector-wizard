# Vector Agile Roadmap Wizard

Vector 是一款高密度、專業的技術設計工具，旨在橋接「非技術決策者」與「AI 程式代理人」。它引導用戶完成敏捷路線圖（Agile Roadmap）訪談，並匯出可供 AI 代理人直接讀取的 YAML 功能規格書。

## 🚀 核心功能

- **互動式規格精靈**: 引導式訪談流程，精確捕捉需求、使用者故事（User Stories）與驗收標準（Acceptance Criteria）。
- **AI 導向匯出**: 產出結構化的 YAML 規格書，優化後可供 AI 代理人（如 Claude Code, Cursor, Copilot）高效理解。
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

## 🏗 專案架構

本專案採用高度自包含的功能模組架構，核心邏輯位於 `src/features/spec-wizard/`：

- **model/**: 定義規範類型 (`FeatureDraft`, `ValidationIssue`) 與驗證規則。
- **services/**: 處理 YAML 序列化、Markdown 摘要與 AI 助手業務邏輯。
- **components/**: 精靈介面、預覽面板與欄位管理等 UI 組件。
- **persistence/**: 本地存儲與 JSON 草稿處理。
- **i18n/**: 基於字典的國際化支援。
- **api/**: 伺服器與客戶端通訊的共用合約（Contracts）。

## 🤖 AI 代理技能：`vector-analyzer`

本倉庫內附可重複使用的技能 `.agents/skills/vector-analyzer/SKILL.md`，教導 AI 代理把既有程式碼逆向分析成符合 Vector 規格的 `FeatureDraft` JSON。產出可直接貼進向導的 Draft Manager。

### 手動安裝（Claude Code）

全域安裝（所有專案皆可使用）：

```bash
mkdir -p ~/.claude/skills
cp -R .agents/skills/vector-analyzer ~/.claude/skills/
```

僅安裝至特定專案（透過複製或軟連結）：

```bash
mkdir -p /path/to/target-repo/.claude/skills
ln -s "$(pwd)/.agents/skills/vector-analyzer" \
      /path/to/target-repo/.claude/skills/vector-analyzer
```

其他代理（Codex、Cursor、Copilot…）可直接讀取 `.agents/skills/vector-analyzer/SKILL.md`，呼叫時指向該檔即可。

### 使用 Agent Prompt 安裝

把以下提示詞貼進任一 AI 代理的新對話，代理會自動偵測平台並完成安裝：

> 請幫我安裝本倉庫的 `vector-analyzer` 技能，檔案位於 `.agents/skills/vector-analyzer/SKILL.md`，安裝後我希望可以跨專案重複使用。
>
> 1. 偵測你目前運行於哪個代理平台（Claude Code、Codex、Cursor、Copilot…）。
> 2. 若為 Claude Code：把整個目錄複製到 `~/.claude/skills/vector-analyzer/`。
> 3. 若為其他代理：請告訴我此系統建議的安裝路徑，並先提案 `cp` 或 `ln -s` 指令再執行。
> 4. 確認目的地、執行指令，並回讀 `SKILL.md` 驗證安裝成功。
> 5. 印出一行使用提示：說明該平台應如何呼叫此技能。

### 從 GitHub 透過 Agent Prompt 安裝

若尚未 clone 本倉庫，把以下提示詞貼進任一 AI 代理，它會自動從 GitHub 抓取並安裝：

> 請從 https://github.com/CarlLee1983/vector-wizard 安裝 `vector-analyzer` 技能，安裝後我希望可以跨專案重複使用。
>
> 1. 偵測你目前運行於哪個代理平台（Claude Code、Codex、Cursor、Copilot…）。
> 2. 用淺層 clone 抓取倉庫到臨時目錄：`git clone --depth 1 https://github.com/CarlLee1983/vector-wizard /tmp/vector-wizard-skill`。
> 3. 若為 Claude Code：將 `/tmp/vector-wizard-skill/.agents/skills/vector-analyzer` 複製至 `~/.claude/skills/vector-analyzer/`。
> 4. 若為其他代理：請告訴我建議的安裝路徑，並先提案 `cp` 或 `ln -s` 指令再執行。
> 5. 清理臨時 clone。
> 6. 從安裝目的地回讀 `SKILL.md` 驗證成功，並印出一行使用提示。

### 使用方式

安裝完成後，請對你的代理說：

> 請使用 `vector-analyzer` 技能分析這個專案，產出一份 `FeatureDraft` JSON，我會把它貼進 `npx vector-wizard` 的 Draft Manager。

## 📄 授權

本專案為內部使用之私有專案。
