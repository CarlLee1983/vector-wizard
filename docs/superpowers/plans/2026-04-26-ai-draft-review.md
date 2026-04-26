# AI Draft Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "複製 AI 審閱 prompt" button to the Review Summary tab that copies a structured review prompt (covering 6 quality dimensions + human summary + YAML) to the clipboard, so users can paste it to any external AI agent (Claude Code, Codex, ChatGPT) for spec quality feedback.

**Architecture:** Pure-frontend addition. New `services/reviewPromptBuilder.ts` (pure function) assembles a string from existing local `draftToYaml(draft)` + `buildHumanSummary(draft)` + a localized template. New section rendered inside `ReviewPanel.tsx`. No new API route, no LLM integration, no parsing of AI responses. UI labels follow `useI18n()` UI locale; prompt content follows `draft.metadata.locale`.

**Tech Stack:** Next.js 15 + React 19 + TypeScript. Vitest + @testing-library/react + @testing-library/user-event for tests. Bun as package manager.

**Source spec:** `docs/superpowers/specs/2026-04-26-ai-draft-review-design.md`

---

## File Structure

| File | Purpose | Action |
|---|---|---|
| `src/features/spec-wizard/i18n/dictionaries.ts` | Add 7 new `MessageKey` entries (6 UI + 1 long template) for `zh-TW` and `en` | Modify |
| `src/features/spec-wizard/services/reviewPromptBuilder.ts` | Pure function `buildReviewPrompt({ yaml, summary, locale })` returning the assembled prompt string | Create |
| `src/features/spec-wizard/components/ReviewPanel.tsx` | Render the "AI 審閱協助" section at the bottom of the summary view; clipboard state machine; fallback textarea | Modify |
| `src/features/spec-wizard/__tests__/reviewPromptBuilder.test.ts` | Unit tests for the builder (both locales, placeholder substitution, structure) | Create |
| `src/features/spec-wizard/__tests__/reviewPanel.test.tsx` | Component tests (section renders, clipboard success/failure, locale separation) | Create |

**Note on spec/code drift:** The spec §4.1 says data comes from `/api/generate-spec`. In current code (`ReviewPanel.tsx:21-22`), `yaml` and `summary` are produced locally via `draftToYaml(draft)` and `buildHumanSummary(draft)`. The architecture decision (pure client-side, no new API route) still holds. The "section hides when YAML missing" edge case from spec §8 does not apply because local generation always returns a non-empty string; we will not implement that conditional render.

---

## Task 1: Add UI i18n keys for the AI Review section

**Files:**
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`
- Test: `src/features/spec-wizard/__tests__/i18n.test.tsx` (existing — append assertions)

- [ ] **Step 1: Inspect existing i18n test file**

Run: `bunx vitest run src/features/spec-wizard/__tests__/i18n.test.tsx --reporter=verbose 2>&1 | head -40`
Expected: file exists, current tests pass. We append new assertions in step 2.

- [ ] **Step 2: Write failing tests for the 6 UI keys**

Append to `src/features/spec-wizard/__tests__/i18n.test.tsx`:

```ts
import { dictionaries } from "../i18n/dictionaries";

describe("AI review prompt UI keys", () => {
  const uiKeys = [
    "reviewPrompt.section.title",
    "reviewPrompt.section.description",
    "reviewPrompt.button.idle",
    "reviewPrompt.button.copied",
    "reviewPrompt.button.failed",
    "reviewPrompt.fallback.label"
  ] as const;

  it("provides zh-TW translations for every UI key", () => {
    for (const key of uiKeys) {
      expect(dictionaries["zh-TW"][key]).toBeTruthy();
    }
  });

  it("provides en translations for every UI key", () => {
    for (const key of uiKeys) {
      expect(dictionaries.en[key]).toBeTruthy();
    }
  });

  it("uses distinct strings per locale for the section title", () => {
    expect(dictionaries["zh-TW"]["reviewPrompt.section.title"]).not.toEqual(
      dictionaries.en["reviewPrompt.section.title"]
    );
  });
});
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/i18n.test.tsx -t "AI review prompt UI keys"`
Expected: FAIL — TypeScript error or runtime undefined for the new keys.

- [ ] **Step 4: Add the 6 keys to `MessageKey` union and to both dictionaries**

In `src/features/spec-wizard/i18n/dictionaries.ts`, extend the `MessageKey` union (after line 90, before the closing `;`) with:

```ts
  | "reviewPrompt.section.title"
  | "reviewPrompt.section.description"
  | "reviewPrompt.button.idle"
  | "reviewPrompt.button.copied"
  | "reviewPrompt.button.failed"
  | "reviewPrompt.fallback.label";
```

Then in the `zh-TW` block (after `"validation.openQuestionsPresent": "仍有未解問題."`, add a comma and):

```ts
    "reviewPrompt.section.title": "AI 審閱協助",
    "reviewPrompt.section.description": "複製後可貼到 Claude Code、ChatGPT 等 AI agent，請其針對本 spec 提出改良建議。AI 不會直接修改本草稿。",
    "reviewPrompt.button.idle": "複製 AI 審閱 prompt",
    "reviewPrompt.button.copied": "已複製 ✓",
    "reviewPrompt.button.failed": "複製失敗，請手動複製",
    "reviewPrompt.fallback.label": "Prompt 內容（可手動全選複製）",
```

In the `en` block (after `"validation.openQuestionsPresent": "Open questions remain."`, add a comma and):

```ts
    "reviewPrompt.section.title": "AI Review Assistance",
    "reviewPrompt.section.description": "Copy and paste into any AI agent (Claude Code, ChatGPT, etc.) to request feedback on this spec. AI will not modify this draft directly.",
    "reviewPrompt.button.idle": "Copy AI Review Prompt",
    "reviewPrompt.button.copied": "Copied ✓",
    "reviewPrompt.button.failed": "Copy failed, please copy manually",
    "reviewPrompt.fallback.label": "Prompt content (select all to copy manually)",
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/i18n.test.tsx -t "AI review prompt UI keys"`
Expected: PASS (3 tests).

- [ ] **Step 6: Type-check**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/spec-wizard/i18n/dictionaries.ts src/features/spec-wizard/__tests__/i18n.test.tsx
git commit -m "feat: [spec-wizard] 新增 AI 審閱協助 UI i18n keys"
```

---

## Task 2: Add the prompt template i18n key

**Files:**
- Modify: `src/features/spec-wizard/i18n/dictionaries.ts`
- Test: `src/features/spec-wizard/__tests__/i18n.test.tsx`

- [ ] **Step 1: Write failing tests for the template key**

Append to `src/features/spec-wizard/__tests__/i18n.test.tsx`:

```ts
describe("AI review prompt template", () => {
  it("zh-TW template contains the 6 dimension headings and placeholders", () => {
    const t = dictionaries["zh-TW"]["reviewPrompt.template"];
    expect(t).toContain("目標清晰度");
    expect(t).toContain("使用者故事完整性");
    expect(t).toContain("驗收條件可測性");
    expect(t).toContain("範例邊界涵蓋");
    expect(t).toContain("Agent 邊界充分性");
    expect(t).toContain("區段間一致性");
    expect(t).toContain("{{summary_markdown}}");
    expect(t).toContain("{{yaml_content}}");
  });

  it("en template contains the 6 dimension headings and placeholders", () => {
    const t = dictionaries.en["reviewPrompt.template"];
    expect(t).toContain("Goal clarity");
    expect(t).toContain("Story completeness");
    expect(t).toContain("Acceptance criteria testability");
    expect(t).toContain("Example coverage");
    expect(t).toContain("Agent boundary sufficiency");
    expect(t).toContain("Cross-section consistency");
    expect(t).toContain("{{summary_markdown}}");
    expect(t).toContain("{{yaml_content}}");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/i18n.test.tsx -t "AI review prompt template"`
Expected: FAIL — `reviewPrompt.template` is not yet a valid `MessageKey`.

- [ ] **Step 3: Add `reviewPrompt.template` to the `MessageKey` union**

Add to the `MessageKey` union at the end (replacing the existing trailing semicolon on the last entry from Task 1):

```ts
  | "reviewPrompt.fallback.label"
  | "reviewPrompt.template";
```

- [ ] **Step 4: Add the zh-TW template string**

In the `zh-TW` block, after `"reviewPrompt.fallback.label": "Prompt 內容（可手動全選複製）",`, add:

```ts
    "reviewPrompt.template": `# 規格審閱請求

你是一位資深產品/工程顧問，專長是為 AI coding agent 撰寫的功能規格做品質審閱。

## 任務

請針對下方功能規格給出改良建議。請**只給審閱回饋**，不要直接撰寫程式碼或重新撰寫規格。所有建議都要對應到下方 checklist 中的某個維度，並指出 spec 中具體位置（例如 \`productSpec.goal.statement\`、\`epics[0].stories[0].acceptanceCriteria\`）以利原作者回到編輯器修正對應欄位。

## 審閱維度（請對每一項給出「評估」與「具體建議」）

1. **目標清晰度（Goal clarity）**：\`goal.statement\` 是否清楚描述「為誰、解決什麼問題、達到什麼狀態」？\`successSignals\` 是否實際可量測？
2. **使用者故事完整性（Story completeness）**：每個 story 的 \`userStory\` 是否包含角色、想做什麼、為什麼？標題與內文是否一致？
3. **驗收條件可測性（Acceptance criteria testability）**：每條 AC 是否可直接轉成自動化測試？是否避免主觀字眼（「好用」、「合理」、「順暢」）？
4. **範例邊界涵蓋（Example coverage）**：examples 是否涵蓋 happy path、邊界情況、錯誤情境？given/when/then 是否完整？
5. **Agent 邊界充分性（Agent boundary sufficiency）**：\`agentSpec\` 中的 \`nonGoals\`、\`constraints\`、\`risks\` 是否足以避免 AI coding agent 過度實作、超出範圍、或產生不安全行為？
6. **區段間一致性（Cross-section consistency）**：\`goal\` 與 \`stories\` 是否對齊？\`impacts\` 中提到的 actor 是否在 \`stories\` 或 \`userActivities\` 中也有出現？\`constraints\` 是否與任何 story 互相抵觸？

## 回應格式

請依下列格式回覆，每個維度一段：

### 1. 目標清晰度
- 評估：（一兩句）
- 建議：（條列，每條附 spec 位置）

（依此類推到第 6 項）

### 整體優先順序
最後請列出你認為最該優先修正的 3 項。

---

## Spec 內容

### 人類摘要

{{summary_markdown}}

### YAML

\`\`\`yaml
{{yaml_content}}
\`\`\`
`,
```

- [ ] **Step 5: Add the en template string**

In the `en` block, after `"reviewPrompt.fallback.label": "Prompt content (select all to copy manually)",`, add:

```ts
    "reviewPrompt.template": `# Spec Review Request

You are a senior product/engineering reviewer specializing in feature specifications written for AI coding agents.

## Task

Review the feature spec below and provide improvement suggestions. Provide **review feedback only** — do not write code or rewrite the spec yourself. Every suggestion must map to one of the dimensions in the checklist and reference the exact spec location (e.g., \`productSpec.goal.statement\`, \`epics[0].stories[0].acceptanceCriteria\`) so the author can edit the corresponding field.

## Review dimensions (provide an "assessment" and "concrete suggestions" for each)

1. **Goal clarity**: Does \`goal.statement\` clearly describe who, what problem, and what end state? Are \`successSignals\` actually measurable?
2. **Story completeness**: Does each story's \`userStory\` include role, want, and reason? Are title and body aligned?
3. **Acceptance criteria testability**: Can each AC be directly translated into an automated test? Does it avoid subjective wording ("good", "reasonable", "smooth")?
4. **Example coverage**: Do examples cover happy path, boundaries, and error cases? Are given/when/then complete?
5. **Agent boundary sufficiency**: Are \`agentSpec.nonGoals\`, \`constraints\`, and \`risks\` enough to prevent over-implementation, scope creep, or unsafe behavior by AI coding agents?
6. **Cross-section consistency**: Do \`goal\` and \`stories\` align? Do actors mentioned in \`impacts\` also appear in \`stories\` or \`userActivities\`? Do \`constraints\` conflict with any story?

## Response format

Reply in the following structure, one section per dimension:

### 1. Goal clarity
- Assessment: (one or two sentences)
- Suggestions: (bullet list, each with spec location)

(Repeat for items 2-6.)

### Overall priorities
At the end, list the top 3 items you would prioritize fixing.

---

## Spec content

### Human-readable summary

{{summary_markdown}}

### YAML

\`\`\`yaml
{{yaml_content}}
\`\`\`
`,
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/i18n.test.tsx -t "AI review prompt template"`
Expected: PASS (2 tests).

- [ ] **Step 7: Type-check**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/spec-wizard/i18n/dictionaries.ts src/features/spec-wizard/__tests__/i18n.test.tsx
git commit -m "feat: [spec-wizard] 新增 AI 審閱 prompt 範本（zh-TW + en）"
```

---

## Task 3: Create `buildReviewPrompt` service

**Files:**
- Create: `src/features/spec-wizard/services/reviewPromptBuilder.ts`
- Create: `src/features/spec-wizard/__tests__/reviewPromptBuilder.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/features/spec-wizard/__tests__/reviewPromptBuilder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildReviewPrompt } from "../services/reviewPromptBuilder";

describe("buildReviewPrompt", () => {
  const sampleYaml = 'schemaVersion: "0.1"\nmetadata:\n  title: "Demo"\n';
  const sampleSummary = "# Demo\n\nGoal: do the thing.";

  it("substitutes summary and yaml placeholders for zh-TW", () => {
    const prompt = buildReviewPrompt({
      yaml: sampleYaml,
      summary: sampleSummary,
      locale: "zh-TW"
    });

    expect(prompt).toContain("# 規格審閱請求");
    expect(prompt).toContain("目標清晰度");
    expect(prompt).toContain(sampleYaml);
    expect(prompt).toContain(sampleSummary);
    expect(prompt).not.toContain("{{summary_markdown}}");
    expect(prompt).not.toContain("{{yaml_content}}");
  });

  it("substitutes summary and yaml placeholders for en", () => {
    const prompt = buildReviewPrompt({
      yaml: sampleYaml,
      summary: sampleSummary,
      locale: "en"
    });

    expect(prompt).toContain("# Spec Review Request");
    expect(prompt).toContain("Goal clarity");
    expect(prompt).toContain(sampleYaml);
    expect(prompt).toContain(sampleSummary);
    expect(prompt).not.toContain("{{summary_markdown}}");
    expect(prompt).not.toContain("{{yaml_content}}");
  });

  it("preserves structure when summary and yaml are empty strings", () => {
    const prompt = buildReviewPrompt({ yaml: "", summary: "", locale: "zh-TW" });

    expect(prompt).toContain("# 規格審閱請求");
    expect(prompt).toContain("區段間一致性");
    expect(prompt).not.toContain("{{summary_markdown}}");
    expect(prompt).not.toContain("{{yaml_content}}");
  });

  it("does not escape special characters in yaml content (raw passthrough)", () => {
    const yaml = 'title: "value with $pecial & <chars>"';
    const prompt = buildReviewPrompt({ yaml, summary: "ok", locale: "en" });

    expect(prompt).toContain(yaml);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPromptBuilder.test.ts`
Expected: FAIL — `Cannot find module '../services/reviewPromptBuilder'`.

- [ ] **Step 3: Create the builder file**

Create `src/features/spec-wizard/services/reviewPromptBuilder.ts`:

```ts
import { dictionaries } from "../i18n/dictionaries";
import type { Locale } from "../model/specTypes";

export type BuildReviewPromptInput = {
  yaml: string;
  summary: string;
  locale: Locale;
};

export function buildReviewPrompt(input: BuildReviewPromptInput): string {
  const template = dictionaries[input.locale]["reviewPrompt.template"];
  return template
    .replace("{{summary_markdown}}", input.summary)
    .replace("{{yaml_content}}", input.yaml);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPromptBuilder.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/services/reviewPromptBuilder.ts src/features/spec-wizard/__tests__/reviewPromptBuilder.test.ts
git commit -m "feat: [spec-wizard] 新增 buildReviewPrompt 服務"
```

---

## Task 4: Render the AI Review section in `ReviewPanel`

**Files:**
- Modify: `src/features/spec-wizard/components/ReviewPanel.tsx`
- Create: `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`

- [ ] **Step 1: Write the failing test for section rendering**

Create `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { ReviewPanel } from "../components/ReviewPanel";
import { minimalValidDraft } from "../test/fixtures";

function renderPanel() {
  return render(
    <I18nProvider>
      <ReviewPanel draft={minimalValidDraft()} />
    </I18nProvider>
  );
}

describe("ReviewPanel — AI 審閱協助 section", () => {
  it("renders the section title, description and copy button", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "AI 審閱協助" })).toBeInTheDocument();
    expect(screen.getByText(/複製後可貼到 Claude Code/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "複製 AI 審閱 prompt" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx`
Expected: FAIL — heading "AI 審閱協助" not found.

- [ ] **Step 3: Add the section to ReviewPanel**

In `src/features/spec-wizard/components/ReviewPanel.tsx`:

a) Update imports at the top (replace lines 1-9 entirely):

```tsx
"use client";

import { useMemo, useState } from "react";
import type { FeatureDraft } from "../model/specTypes";
import { validateDraft } from "../model/validation";
import { buildHumanSummary } from "../services/summary";
import { draftToYaml } from "../services/yamlSerializer";
import { draftToJson } from "../persistence/draftStorage";
import { buildReviewPrompt } from "../services/reviewPromptBuilder";
import { useI18n } from "../i18n/I18nContext";
```

b) Inside the `ReviewPanel` function, after the existing `yaml` `useMemo` (line 21), add:

```tsx
  const reviewPrompt = useMemo(
    () => buildReviewPrompt({ yaml, summary, locale: draft.metadata.locale }),
    [yaml, summary, draft.metadata.locale]
  );
```

c) Just before the closing `</section>` tag (currently after `<pre>{tab === "summary" ? summary : yaml}</pre>` on line 63), insert:

```tsx
      <div className="ai-review-section">
        <h3>{t("reviewPrompt.section.title")}</h3>
        <p className="section-help">{t("reviewPrompt.section.description")}</p>
        <button type="button">
          {t("reviewPrompt.button.idle")}
        </button>
      </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Type-check**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/components/ReviewPanel.tsx src/features/spec-wizard/__tests__/reviewPanel.test.tsx
git commit -m "feat: [spec-wizard] ReviewPanel 新增 AI 審閱協助區塊"
```

---

## Task 5: Wire the clipboard success flow

**Files:**
- Modify: `src/features/spec-wizard/components/ReviewPanel.tsx`
- Modify: `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`

- [ ] **Step 1: Write the failing tests for clipboard success**

Append to `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { buildReviewPrompt } from "../services/reviewPromptBuilder";
import { buildHumanSummary } from "../services/summary";
import { draftToYaml } from "../services/yamlSerializer";

describe("ReviewPanel — clipboard success flow", () => {
  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies the assembled prompt to clipboard and toggles to copied label", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPanel();

    const button = screen.getByRole("button", { name: "複製 AI 審閱 prompt" });
    await user.click(button);

    const draft = minimalValidDraft();
    const expected = buildReviewPrompt({
      yaml: draftToYaml(draft),
      summary: buildHumanSummary(draft),
      locale: draft.metadata.locale
    });
    expect(writeTextSpy).toHaveBeenCalledWith(expected);
    expect(screen.getByRole("button", { name: "已複製 ✓" })).toBeInTheDocument();
  });

  it("reverts the button label after 2 seconds", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPanel();

    await user.click(screen.getByRole("button", { name: "複製 AI 審閱 prompt" }));
    expect(screen.getByRole("button", { name: "已複製 ✓" })).toBeInTheDocument();

    vi.advanceTimersByTime(2000);

    expect(screen.getByRole("button", { name: "複製 AI 審閱 prompt" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "clipboard success"`
Expected: FAIL — `writeTextSpy` not called and button label does not change.

- [ ] **Step 3: Implement the click handler and state machine**

In `src/features/spec-wizard/components/ReviewPanel.tsx`, inside the `ReviewPanel` function and after the `reviewPrompt` `useMemo` from Task 4, add:

```tsx
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopyReviewPrompt() {
    try {
      await navigator.clipboard.writeText(reviewPrompt);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  }

  const reviewButtonLabel =
    copyState === "copied"
      ? t("reviewPrompt.button.copied")
      : copyState === "failed"
        ? t("reviewPrompt.button.failed")
        : t("reviewPrompt.button.idle");
```

Then replace the `<button>` inside the AI review section (added in Task 4 step 3c) with:

```tsx
        <button type="button" onClick={handleCopyReviewPrompt}>
          {reviewButtonLabel}
        </button>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "clipboard success"`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full reviewPanel test file**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx`
Expected: PASS (all 3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/spec-wizard/components/ReviewPanel.tsx src/features/spec-wizard/__tests__/reviewPanel.test.tsx
git commit -m "feat: [spec-wizard] AI 審閱按鈕剪貼簿成功流程"
```

---

## Task 6: Wire the clipboard failure flow with fallback textarea

**Files:**
- Modify: `src/features/spec-wizard/components/ReviewPanel.tsx`
- Modify: `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`

- [ ] **Step 1: Write the failing tests for clipboard failure**

Append to `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`:

```tsx
describe("ReviewPanel — clipboard failure flow", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
      writable: true
    });
  });

  it("shows the failure label and reveals the fallback textarea with prompt content", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "複製 AI 審閱 prompt" }));

    expect(
      await screen.findByRole("button", { name: "複製失敗，請手動複製" })
    ).toBeInTheDocument();

    const textarea = screen.getByLabelText("Prompt 內容（可手動全選複製）") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.readOnly).toBe(true);

    const draft = minimalValidDraft();
    const expected = buildReviewPrompt({
      yaml: draftToYaml(draft),
      summary: buildHumanSummary(draft),
      locale: draft.metadata.locale
    });
    expect(textarea.value).toBe(expected);
  });

  it("does not render the fallback textarea before any copy attempt", () => {
    renderPanel();
    expect(screen.queryByLabelText("Prompt 內容（可手動全選複製）")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "clipboard failure"`
Expected: FAIL — failure label and textarea not present.

- [ ] **Step 3: Render the fallback textarea conditionally**

In `src/features/spec-wizard/components/ReviewPanel.tsx`, inside the AI review section JSX (added in Task 4), after the `<button>`, add:

```tsx
        {copyState === "failed" ? (
          <label className="stack">
            <span>{t("reviewPrompt.fallback.label")}</span>
            <textarea readOnly value={reviewPrompt} rows={10} />
          </label>
        ) : null}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "clipboard failure"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/spec-wizard/components/ReviewPanel.tsx src/features/spec-wizard/__tests__/reviewPanel.test.tsx
git commit -m "feat: [spec-wizard] AI 審閱按鈕剪貼簿失敗 fallback"
```

---

## Task 7: Verify dual-locale separation (UI vs prompt content)

**Files:**
- Modify: `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`

- [ ] **Step 1: Write the test for locale separation**

Append to `src/features/spec-wizard/__tests__/reviewPanel.test.tsx`:

```tsx
describe("ReviewPanel — dual-locale separation", () => {
  it("uses the draft locale for prompt content even when UI locale differs", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true
    });

    const user = userEvent.setup();
    const draft = minimalValidDraft();
    draft.metadata.locale = "en";

    render(
      <I18nProvider>
        <ReviewPanel draft={draft} />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: "AI 審閱協助" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "複製 AI 審閱 prompt" }));

    const sentText = writeTextSpy.mock.calls[0][0] as string;
    expect(sentText).toContain("# Spec Review Request");
    expect(sentText).not.toContain("# 規格審閱請求");
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `bunx vitest run src/features/spec-wizard/__tests__/reviewPanel.test.tsx -t "dual-locale"`
Expected: PASS — Task 4 already wired `locale: draft.metadata.locale` in the `useMemo`. This test asserts that existing wiring is correct.

If the test FAILS instead, the wiring in Task 4 was wrong. Fix: in `ReviewPanel.tsx` ensure the `useMemo` reads `draft.metadata.locale`, NOT `useI18n().locale`.

- [ ] **Step 3: Commit (only if test file changed)**

```bash
git add src/features/spec-wizard/__tests__/reviewPanel.test.tsx
git commit -m "test: [spec-wizard] 驗證 AI 審閱 prompt 雙軌 locale 分離"
```

---

## Task 8: Run the full test suite and type-check

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

Run: `bun run test`
Expected: ALL PASS. No regressions in existing tests.

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: 0 errors / 0 warnings (or matches existing baseline if codebase has known warnings).

- [ ] **Step 4: Manual smoke test**

Run: `bun run dev`
Then in a browser: open `http://localhost:3000`, complete a minimal feature spec, navigate to Review and Export, look for the "AI 審閱協助" section at the bottom of the panel. Click the button. Confirm:
- Button label briefly shows "已複製 ✓".
- Open a notepad and paste; the prompt is the full structured zh-TW prompt with summary + YAML inline.
- Switch the wizard's draft language to en in step 1 — re-paste the prompt and confirm it now starts with "# Spec Review Request".

If smoke test fails, fix issues and re-run from Step 1.

- [ ] **Step 5: No commit needed** if all checks pass without code changes.

---

## Self-Review Checklist (run before declaring done)

- Spec §2 (In scope) — every bullet maps to a task: section UI ✓ T4, prompt structure ✓ T2/T3, locale switching ✓ T7, success/failure feedback ✓ T5/T6, fallback textarea ✓ T6, vitest coverage ✓ T1-T7.
- Spec §5 (Prompt template) — 6 dimensions present in T2 zh-TW + en strings, asserted in T2 tests; placeholder substitution asserted in T3.
- Spec §6 (UI states) — idle/copied/failed implemented in T5 state machine, asserted in T5/T6.
- Spec §7 (i18n dual-track) — UI strings via `useI18n()` (T4), prompt content via `draft.metadata.locale` (T4 useMemo, asserted in T7).
- Spec §8 (Edge cases) — blocking errors don't disable button (the new button has no `disabled` prop, unlike copy YAML); empty draft works (no special handling); clipboard failure → fallback (T6); long YAML → no truncation (string passed as-is in T3).
- Spec §9 (Testing) — `reviewPromptBuilder.test.ts` (T3), `reviewPanel.test.tsx` (T4-T7).
- Spec §10 (MVP completion) — all bullets covered.
- Existing `/api/assist` and `/api/generate-spec` are not modified by any task — invariant preserved.
