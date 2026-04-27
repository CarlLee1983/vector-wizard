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

## 📄 授權

本專案為內部使用之私有專案。
