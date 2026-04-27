---
name: Vector Design System
version: 0.2.0
description: A paper-like, high-density technical design system inspired by professional technical documentation.
tokens:
  colors:
    primary: "#D97757" # 磚橘色 (Terracotta Orange) - 用於行動按鈕與重點
    secondary: "#635C55" # 岩灰色 (Slate Brown) - 用於次要資訊與 AI 提示
    background: "#F9F5F1" # 暖紙色 (Warm Paper Beige) - 基礎背景
    surface: "#FFFFFF" # 純白介面 (Pure White Surface) - 內容容器
    border: "#E5E0DA" # 柔軟邊框 (Soft Border) - 區塊分割線
    text:
      main: "#2D2621" # 深焦茶 (Deep Espresso) - 主要文字
      muted: "#8C847D" # 暖灰 (Warm Gray) - 輔助文字
      accent: "#D97757"
    status:
      error: "#E64833"
      warning: "#F5A623"
      success: "#4A7C59"
  typography:
    sans: "'Outfit', 'Inter', system-ui, sans-serif"
    mono: "'JetBrains Mono', 'Roboto Mono', monospace"
    baseSize: "14px"
    lineHeight: "1.6"
  spacing:
    unit: 4
    scale: [0, 4, 8, 16, 24, 32, 64]
  components:
    borderRadius: "6px" # 現代、專業的柔和感
    borderWidth: "1px"
    shadows:
      focus: "0 0 0 2px rgba(217, 119, 87, 0.2)"
      card: "0 2px 4px rgba(0, 0, 0, 0.02)"
---

# Vector Design Philosophy

## 1. Context & Purpose

Vector 旨在橋接「非技術決策者」與「AI 程式代理人」。設計風格對標現代技術白皮書與優質開發者工具，傳達出一種 **「溫暖、專業、易於理解」** 的數位文件感。

## 2. Visual Principles (Aligned with Reference)

參考圖展示了一種高度結構化的資訊層級，Vector 採納以下規則：

- **Professional Density**: 資訊密度高但層級清晰。使用細線（1px）與微幅的背景色差（Surface vs Background）區隔區塊。
- **Warm & Organic**: 捨棄冰冷的黑綠色系，改用暖米色、深棕色與磚橘色，降低長時間編寫規格書的視覺疲勞。
- **Technical Precision**: 關鍵術語標籤與導航採用等寬字型（Monospace），並在重要步驟使用數字編號（如圖片下方的 1-4 區塊）。

## 3. Component Rules

### Wizard Steps (導航組件)

- **Active State**: 文字加粗並使用 `primary` 底線，移除發光效果，改以純色強調。
- **Completed State**: 使用 `muted` 顏色與圓圈勾選標記，維持介面簡潔。

### Input Fields (輸入欄位)

- **Focus State**: 邊框轉為 `primary` 色，移除發光（Glow），改用細微的內陰影或 Shadow Focus。
- **Validation**: 錯誤訊息應清晰易讀，而非強烈閃爍。

### Review Panel (預覽面板)

- **YAML Tab**: 背景使用深茶色（Deep Espresso `#332F2E`），與主介面的輕盈感形成對比，模擬「原始數據」的專業感。
- **Summary Tab**: 採用高品質的報表排版，標題字級加大，並使用 1, 2, 3 序號強化閱讀路徑。

## 4. Accessibility & Invariants

- **Contrast**: 暖色系下仍需嚴格遵守 WCAG AA 對比度要求。
- **Motion**: 切換動作應如翻頁般自然，使用微小的透明度淡入（Fade-in）而非劇烈滑動。
- **Locale Consistency**:
  - UI 標籤隨語系切換。
  - YAML 鍵名與技術術語保持英文。

## 5. Usage Examples

### 建立一個 User Story

Step 4 的佈局應像是一個結構化的表格。每一個 User Story 都是一個白色 `surface` 容器，帶有細微邊框。

### 觸發 AI 助手 (Assist)

AI 建議的文字以 `secondary` 的細線框住，按鈕改為圓角實色按鈕。

---

_Note: This DESIGN.md is a living contract between the UX intent and the Gemini/Claude implementer._
