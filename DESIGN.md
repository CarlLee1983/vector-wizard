---
name: Vector Design System
version: 0.2.0
description: A paper-like, high-density technical design system inspired by professional technical documentation.
tokens:
  colors:
    primary: "#D97757" # Terracotta Orange - for action buttons and emphasis
    secondary: "#635C55" # Slate Brown - for secondary info and AI hints
    background: "#F9F5F1" # Warm Paper Beige - base background
    surface: "#FFFFFF" # Pure White Surface - content containers
    border: "#E5E0DA" # Soft Border - section dividers
    text:
      main: "#2D2621" # Deep Espresso - main text
      muted: "#8C847D" # Warm Gray - auxiliary text
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
    borderRadius: "6px" # Modern, professional softness
    borderWidth: "1px"
    shadows:
      focus: "0 0 0 2px rgba(217, 119, 87, 0.2)"
      card: "0 2px 4px rgba(0, 0, 0, 0.02)"
---

# Vector Design Philosophy

## 1. Context & Purpose

Vector aims to bridge the gap between "non-technical decision-makers" and "AI coding agents." The design style is benchmarked against modern technical whitepapers and premium developer tools, conveying a **"warm, professional, and easy-to-understand"** digital document feel.

## 2. Visual Principles

The system adopts a highly structured information hierarchy based on the following rules:

- **Professional Density**: High information density with clear hierarchy. Uses fine lines (1px) and subtle background color differences (Surface vs. Background) to distinguish sections.
- **Warm & Organic**: Moves away from cold black-and-green palettes, opting instead for warm beige, deep espresso, and terracotta orange to reduce visual fatigue during long specification drafting sessions.
- **Technical Precision**: Key term tags and navigation use monospaced fonts (Monospace), with numbered steps (e.g., sections 1-4 below images) for important flows.

## 3. Component Rules

### Wizard Steps (Navigation)

- **Active State**: Bold text with a `primary` underline; remove glow effects, favoring solid color emphasis.
- **Completed State**: Use `muted` colors with circular checkmark indicators to keep the interface clean.

### Input Fields

- **Focus State**: Border transitions to `primary` color; remove glow, using subtle inner shadows or Focus Shadows instead.
- **Validation**: Error messages should be clear and legible, avoiding intense flashing.

### Review Panel

- **YAML Tab**: Background uses Deep Espresso (`#332F2E`), contrasting with the light feel of the main interface to simulate the professional "raw data" aesthetic.
- **Summary Tab**: High-quality report-style layout with enlarged headers and numbered sequences (1, 2, 3) to guide the reader's eye.

## 4. Accessibility & Invariants

- **Contrast**: Strictly adhere to WCAG AA contrast requirements despite the warm palette.
- **Motion**: Transitions should feel as natural as turning a page; use subtle opacity fade-ins rather than dramatic sliding animations.
- **Locale Consistency**:
  * UI labels switch with language.
  * YAML keys and technical terminology remain in English.

## 5. Usage Examples

### Create a User Story

The Step 4 layout should resemble a structured table. Each User Story is a white `surface` container with a fine border.

### Trigger AI Assistant (Assist)

AI-suggested text is framed with a `secondary` fine line; buttons are rounded solid-color buttons.

---

_Note: This DESIGN.md is a living contract between the UX intent and the Gemini/Claude implementer._
