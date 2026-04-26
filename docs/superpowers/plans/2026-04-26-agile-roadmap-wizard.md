# Agile Roadmap Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js Wizard that converts non-technical agile roadmap input into a human-reviewable summary and agent-ready YAML Feature Spec.

**Architecture:** Use a single Next.js / React / TypeScript app with focused feature modules under `src/features/spec-wizard`. The frontend owns Wizard state, i18n, draft persistence, and review UI; API routes own normalization, validation, YAML generation, and optional mock AI assistance.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, localStorage, server-side API routes, custom YAML serializer, mock LLM adapter.

---

## File Structure

Create this project structure:

```text
app/
  api/
    assist/route.ts
    generate-spec/route.ts
  globals.css
  layout.tsx
  page.tsx
src/
  features/spec-wizard/
    api/contracts.ts
    components/FieldArray.tsx
    components/ReviewPanel.tsx
    components/Wizard.tsx
    components/WizardStep.tsx
    i18n/dictionaries.ts
    i18n/I18nContext.tsx
    model/defaultDraft.ts
    model/specTypes.ts
    model/validation.ts
    persistence/draftStorage.ts
    services/assistService.ts
    services/summary.ts
    services/yamlSerializer.ts
    test/fixtures.ts
    test/setup.ts
    __tests__/
      assistService.test.ts
      draftStorage.test.ts
      generateSpecRoute.test.ts
      i18n.test.tsx
      validation.test.ts
      wizardFlow.test.tsx
      yamlSerializer.test.ts
package.json
next.config.mjs
tsconfig.json
vitest.config.ts
```

Boundaries:

- `model/*` contains serializable domain types and validation only.
- `services/*` converts drafts into summaries/YAML or AI-assist responses.
- `persistence/*` is browser storage only.
- `components/*` contains React UI only.
- `app/api/*` adapts HTTP requests to feature services.

---

### Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/features/spec-wizard/test/setup.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Create package manifest and scripts**

Create `package.json`:

```json
{
  "name": "vector-agile-roadmap-wizard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Create Next config**

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

- [ ] **Step 3: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/features/spec-wizard/test/setup.ts"]
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
```

- [ ] **Step 5: Create test setup**

Create `src/features/spec-wizard/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Create root layout and page shell**

Create `app/layout.tsx`:

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agile Roadmap Wizard",
  description: "Convert agile roadmap decisions into agent-ready YAML specs."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/page.tsx`:

```tsx
import { Wizard } from "@/features/spec-wizard/components/Wizard";
import { I18nProvider } from "@/features/spec-wizard/i18n/I18nContext";

export default function Home() {
  return (
    <I18nProvider>
      <main className="app-shell">
        <Wizard />
      </main>
    </I18nProvider>
  );
}
```

- [ ] **Step 7: Create global styles**

Create `app/globals.css`:

```css
:root {
  color-scheme: light;
  --background: #f8fafc;
  --foreground: #102033;
  --muted: #64748b;
  --border: #d8e0ea;
  --primary: #1d4ed8;
  --primary-dark: #1e40af;
  --surface: #ffffff;
  --warning: #b45309;
  --error: #b91c1c;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  cursor: pointer;
  padding: 0.65rem 1rem;
}

button.secondary {
  background: #e2e8f0;
  color: var(--foreground);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.app-shell {
  margin: 0 auto;
  max-width: 1120px;
  padding: 2rem;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.field {
  display: grid;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.field label {
  font-weight: 700;
}

.field small {
  color: var(--muted);
}

.field input,
.field textarea,
.field select {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.7rem;
  width: 100%;
}

.field textarea {
  min-height: 96px;
  resize: vertical;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  margin-top: 1.5rem;
}

.stack {
  display: grid;
  gap: 1rem;
}

.warning {
  color: var(--warning);
}

.error {
  color: var(--error);
}

pre {
  background: #0f172a;
  border-radius: 12px;
  color: #e2e8f0;
  overflow: auto;
  padding: 1rem;
}
```

- [ ] **Step 8: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 9: Run initial tests**

Run:

```bash
npm test -- --passWithNoTests
```

Expected: PASS with no tests found or no test files.

- [ ] **Step 10: Commit foundation**

```bash
git add package.json package-lock.json next.config.mjs tsconfig.json vitest.config.ts app src/features/spec-wizard/test/setup.ts
git commit -m "Prepare the Next.js foundation for the wizard

The tool needs a focused React and API foundation before feature work can be built and tested. This commit establishes the Next.js app shell, strict TypeScript settings, Vitest setup, and baseline styling used by later tasks.

Constraint: The approved design uses Next.js, React, TypeScript, and tests from the start
Confidence: high
Scope-risk: narrow
Tested: npm test -- --passWithNoTests
Not-tested: Browser rendering beyond the initial shell"
```

---

### Task 2: Draft Model and Validation

**Files:**
- Create: `src/features/spec-wizard/model/specTypes.ts`
- Create: `src/features/spec-wizard/model/defaultDraft.ts`
- Create: `src/features/spec-wizard/model/validation.ts`
- Create: `src/features/spec-wizard/test/fixtures.ts`
- Create: `src/features/spec-wizard/__tests__/validation.test.ts`

- [ ] **Step 1: Write validation tests first**

Create `src/features/spec-wizard/__tests__/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "../model/defaultDraft";
import { validateDraft } from "../model/validation";
import { minimalValidDraft } from "../test/fixtures";

describe("validateDraft", () => {
  it("accepts a minimal valid draft", () => {
    const result = validateDraft(minimalValidDraft());

    expect(result.blockingErrors).toEqual([]);
    expect(result.warnings.map((warning) => warning.code)).toContain("story_missing_acceptance_criteria");
    expect(result.warnings.map((warning) => warning.code)).toContain("story_missing_examples");
  });

  it("blocks missing title", () => {
    const draft = minimalValidDraft();
    draft.metadata.title = "";

    const result = validateDraft(draft);

    expect(result.blockingErrors).toContainEqual({
      code: "missing_title",
      fieldPath: "metadata.title",
      messageKey: "validation.missingTitle"
    });
  });

  it("blocks missing goal statement", () => {
    const draft = minimalValidDraft();
    draft.goal.statement = "   ";

    const result = validateDraft(draft);

    expect(result.blockingErrors).toContainEqual({
      code: "missing_goal",
      fieldPath: "goal.statement",
      messageKey: "validation.missingGoal"
    });
  });

  it("blocks drafts without stories", () => {
    const draft = minimalValidDraft();
    draft.epics = [{ id: "EP-001", title: "Empty epic", stories: [] }];

    const result = validateDraft(draft);

    expect(result.blockingErrors).toContainEqual({
      code: "missing_story",
      fieldPath: "epics",
      messageKey: "validation.missingStory"
    });
  });

  it("returns warnings for missing boundaries", () => {
    const result = validateDraft(minimalValidDraft());

    expect(result.warnings.map((warning) => warning.code)).toContain("missing_constraints");
    expect(result.warnings.map((warning) => warning.code)).toContain("missing_non_goals");
  });

  it("creates an empty draft with a starter epic and story", () => {
    const draft = createEmptyDraft("zh-TW");

    expect(draft.metadata.locale).toBe("zh-TW");
    expect(draft.epics).toHaveLength(1);
    expect(draft.epics[0].stories).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run validation tests and verify failure**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/validation.test.ts
```

Expected: FAIL because model files do not exist.

- [ ] **Step 3: Create spec types**

Create `src/features/spec-wizard/model/specTypes.ts`:

```ts
export type Locale = "zh-TW" | "en";

export type Impact = {
  id: string;
  actor: string;
  impact: string;
};

export type Deliverable = {
  id: string;
  name: string;
  description: string;
};

export type UserActivity = {
  id: string;
  actor: string;
  activity: string;
};

export type AcceptanceCriterion = {
  id: string;
  statement: string;
};

export type ExampleScenario = {
  id: string;
  format: "given-when-then" | "natural-language";
  given?: string;
  when?: string;
  then?: string;
  scenario?: string;
};

export type UserStory = {
  id: string;
  title: string;
  userStory: string;
  acceptanceCriteria: AcceptanceCriterion[];
  examples: ExampleScenario[];
};

export type Epic = {
  id: string;
  title: string;
  stories: UserStory[];
};

export type FeatureDraft = {
  metadata: {
    title: string;
    owner?: string;
    locale: Locale;
  };
  summary: {
    problem?: string;
    desiredOutcome?: string;
  };
  goal: {
    statement: string;
    successSignals: string[];
  };
  impacts: Impact[];
  deliverables: Deliverable[];
  userActivities: UserActivity[];
  epics: Epic[];
  agentBoundaries: {
    nonGoals: string[];
    constraints: string[];
    testExpectations: string[];
    risks: string[];
    openQuestions: string[];
  };
};

export type ValidationIssue = {
  code:
    | "missing_title"
    | "missing_goal"
    | "missing_story"
    | "story_missing_acceptance_criteria"
    | "story_missing_examples"
    | "missing_constraints"
    | "missing_non_goals"
    | "vague_success_signal"
    | "open_questions_present";
  fieldPath: string;
  messageKey: string;
};

export type ValidationResult = {
  blockingErrors: ValidationIssue[];
  warnings: ValidationIssue[];
};
```

- [ ] **Step 4: Create default draft factory**

Create `src/features/spec-wizard/model/defaultDraft.ts`:

```ts
import type { FeatureDraft, Locale } from "./specTypes";

export function createEmptyDraft(locale: Locale = "zh-TW"): FeatureDraft {
  return {
    metadata: {
      title: "",
      owner: "",
      locale
    },
    summary: {
      problem: "",
      desiredOutcome: ""
    },
    goal: {
      statement: "",
      successSignals: [""]
    },
    impacts: [{ id: "IM-001", actor: "", impact: "" }],
    deliverables: [{ id: "DE-001", name: "", description: "" }],
    userActivities: [{ id: "UA-001", actor: "", activity: "" }],
    epics: [
      {
        id: "EP-001",
        title: "",
        stories: [
          {
            id: "US-001",
            title: "",
            userStory: "",
            acceptanceCriteria: [],
            examples: []
          }
        ]
      }
    ],
    agentBoundaries: {
      nonGoals: [],
      constraints: [],
      testExpectations: [],
      risks: [],
      openQuestions: []
    }
  };
}
```

- [ ] **Step 5: Create validation implementation**

Create `src/features/spec-wizard/model/validation.ts`:

```ts
import type { FeatureDraft, UserStory, ValidationIssue, ValidationResult } from "./specTypes";

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function nonBlankItems(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0);
}

export function getStories(draft: FeatureDraft): UserStory[] {
  return draft.epics.flatMap((epic) => epic.stories);
}

export function validateDraft(draft: FeatureDraft): ValidationResult {
  const blockingErrors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (isBlank(draft.metadata.title)) {
    blockingErrors.push({
      code: "missing_title",
      fieldPath: "metadata.title",
      messageKey: "validation.missingTitle"
    });
  }

  if (isBlank(draft.goal.statement)) {
    blockingErrors.push({
      code: "missing_goal",
      fieldPath: "goal.statement",
      messageKey: "validation.missingGoal"
    });
  }

  const stories = getStories(draft).filter((story) => !isBlank(story.title) || !isBlank(story.userStory));
  if (stories.length === 0) {
    blockingErrors.push({
      code: "missing_story",
      fieldPath: "epics",
      messageKey: "validation.missingStory"
    });
  }

  for (const story of stories) {
    if (story.acceptanceCriteria.length === 0) {
      warnings.push({
        code: "story_missing_acceptance_criteria",
        fieldPath: `stories.${story.id}.acceptanceCriteria`,
        messageKey: "validation.storyMissingAcceptanceCriteria"
      });
    }

    if (story.examples.length === 0) {
      warnings.push({
        code: "story_missing_examples",
        fieldPath: `stories.${story.id}.examples`,
        messageKey: "validation.storyMissingExamples"
      });
    }
  }

  if (nonBlankItems(draft.agentBoundaries.constraints).length === 0) {
    warnings.push({
      code: "missing_constraints",
      fieldPath: "agentBoundaries.constraints",
      messageKey: "validation.missingConstraints"
    });
  }

  if (nonBlankItems(draft.agentBoundaries.nonGoals).length === 0) {
    warnings.push({
      code: "missing_non_goals",
      fieldPath: "agentBoundaries.nonGoals",
      messageKey: "validation.missingNonGoals"
    });
  }

  for (const signal of draft.goal.successSignals) {
    const normalized = signal.trim().toLowerCase();
    if (["better", "faster", "更好", "更快", "提升"].includes(normalized)) {
      warnings.push({
        code: "vague_success_signal",
        fieldPath: "goal.successSignals",
        messageKey: "validation.vagueSuccessSignal"
      });
    }
  }

  if (nonBlankItems(draft.agentBoundaries.openQuestions).length > 0) {
    warnings.push({
      code: "open_questions_present",
      fieldPath: "agentBoundaries.openQuestions",
      messageKey: "validation.openQuestionsPresent"
    });
  }

  return { blockingErrors, warnings };
}
```

- [ ] **Step 6: Create fixtures**

Create `src/features/spec-wizard/test/fixtures.ts`:

```ts
import type { FeatureDraft } from "../model/specTypes";

export function minimalValidDraft(): FeatureDraft {
  return {
    metadata: {
      title: "Login error message improvement",
      owner: "PM Team",
      locale: "en"
    },
    summary: {
      problem: "Users cannot tell how to recover from failed login attempts.",
      desiredOutcome: "Reduce support requests after failed logins."
    },
    goal: {
      statement: "Help users understand what to do after a failed login.",
      successSignals: ["Support requests about failed login decrease"]
    },
    impacts: [
      { id: "IM-001", actor: "Member", impact: "Can recover from login failure without support" }
    ],
    deliverables: [
      { id: "DE-001", name: "Login error messaging", description: "Clear safe messages for common failed-login states" }
    ],
    userActivities: [
      { id: "UA-001", actor: "Member", activity: "Enter credentials and submit the login form" }
    ],
    epics: [
      {
        id: "EP-001",
        title: "Login experience improvement",
        stories: [
          {
            id: "US-001",
            title: "Show a safe failed-login message",
            userStory: "As a member, I want a clear failed-login message so that I know how to recover.",
            acceptanceCriteria: [],
            examples: []
          }
        ]
      }
    ],
    agentBoundaries: {
      nonGoals: [],
      constraints: [],
      testExpectations: [],
      risks: [],
      openQuestions: []
    }
  };
}
```

- [ ] **Step 7: Run validation tests**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/validation.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit model and validation**

```bash
git add src/features/spec-wizard/model src/features/spec-wizard/test/fixtures.ts src/features/spec-wizard/__tests__/validation.test.ts
git commit -m "Define the feature draft contract before UI work

The Wizard needs a stable typed draft model and loose validation before UI, YAML, and API layers can depend on it. The validation rules encode the approved MVP boundary: title, goal, and one story block export, while incomplete criteria, examples, and agent boundaries remain warnings.

Constraint: MVP validation favors completion over rigid agile process enforcement
Confidence: high
Scope-risk: narrow
Tested: npm test -- src/features/spec-wizard/__tests__/validation.test.ts
Not-tested: UI integration"
```

---

### Task 3: YAML Generation and Human Summary

**Files:**
- Create: `src/features/spec-wizard/services/yamlSerializer.ts`
- Create: `src/features/spec-wizard/services/summary.ts`
- Create: `src/features/spec-wizard/__tests__/yamlSerializer.test.ts`

- [ ] **Step 1: Write YAML tests first**

Create `src/features/spec-wizard/__tests__/yamlSerializer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildHumanSummary } from "../services/summary";
import { draftToYaml, normalizeDraftForExport } from "../services/yamlSerializer";
import { minimalValidDraft } from "../test/fixtures";

describe("yamlSerializer", () => {
  it("serializes the required top-level YAML sections", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-26");

    expect(yaml).toContain('schemaVersion: "0.1"');
    expect(yaml).toContain("metadata:");
    expect(yaml).toContain("productSpec:");
    expect(yaml).toContain("agentSpec:");
    expect(yaml).toContain("Login error message improvement");
  });

  it("keeps YAML keys in English for zh-TW drafts", () => {
    const draft = minimalValidDraft();
    draft.metadata.locale = "zh-TW";
    draft.metadata.title = "會員登入錯誤提示優化";

    const yaml = draftToYaml(draft, "2026-04-26");

    expect(yaml).toContain("productSpec:");
    expect(yaml).toContain("agentSpec:");
    expect(yaml).not.toContain("產品規格:");
  });

  it("filters empty optional list items", () => {
    const draft = minimalValidDraft();
    draft.goal.successSignals = ["", "Support tickets decrease", "   "];

    const normalized = normalizeDraftForExport(draft, "2026-04-26");

    expect(normalized.productSpec.goal.successSignals).toEqual(["Support tickets decrease"]);
  });

  it("builds a human-readable summary", () => {
    const summary = buildHumanSummary(minimalValidDraft());

    expect(summary).toContain("Login error message improvement");
    expect(summary).toContain("Help users understand what to do after a failed login.");
    expect(summary).toContain("Show a safe failed-login message");
  });
});
```

- [ ] **Step 2: Run YAML tests and verify failure**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/yamlSerializer.test.ts
```

Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement summary builder**

Create `src/features/spec-wizard/services/summary.ts`:

```ts
import type { FeatureDraft } from "../model/specTypes";
import { getStories } from "../model/validation";

function listOrFallback(items: string[], fallback: string): string {
  const nonBlank = items.filter((item) => item.trim().length > 0);
  return nonBlank.length > 0 ? nonBlank.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

export function buildHumanSummary(draft: FeatureDraft): string {
  const stories = getStories(draft).filter((story) => story.title.trim().length > 0 || story.userStory.trim().length > 0);
  const storyLines = stories.map((story) => `- ${story.title || story.userStory}`).join("\n") || "- No story provided";

  return [
    `# ${draft.metadata.title || "Untitled Feature"}`,
    "",
    `Owner: ${draft.metadata.owner || "Unassigned"}`,
    "",
    "## Problem",
    draft.summary.problem || "No problem statement provided.",
    "",
    "## Desired Outcome",
    draft.summary.desiredOutcome || "No desired outcome provided.",
    "",
    "## Goal",
    draft.goal.statement || "No goal provided.",
    "",
    "## Success Signals",
    listOrFallback(draft.goal.successSignals, "No success signal provided"),
    "",
    "## Stories",
    storyLines,
    "",
    "## Constraints",
    listOrFallback(draft.agentBoundaries.constraints, "No constraints provided"),
    "",
    "## Non-goals",
    listOrFallback(draft.agentBoundaries.nonGoals, "No non-goals provided")
  ].join("\n");
}
```

- [ ] **Step 4: Implement YAML serializer**

Create `src/features/spec-wizard/services/yamlSerializer.ts`:

```ts
import type { FeatureDraft } from "../model/specTypes";

function cleanString(value: string | undefined): string {
  return value?.trim() ?? "";
}

function cleanList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function renderYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const rendered = renderYaml(item, indent + 2);
          return `${pad}- ${rendered.trimStart()}`;
        }
        return `${pad}- ${renderYaml(item, 0)}`;
      })
      .join("\n");
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => {
        if (Array.isArray(child)) {
          if (child.length === 0) return `${pad}${key}: []`;
          return `${pad}${key}:\n${renderYaml(child, indent + 2)}`;
        }
        if (typeof child === "object" && child !== null) {
          return `${pad}${key}:\n${renderYaml(child, indent + 2)}`;
        }
        return `${pad}${key}: ${renderYaml(child, 0)}`;
      })
      .join("\n");
  }

  if (typeof value === "string") return quote(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "null";
}

export function normalizeDraftForExport(draft: FeatureDraft, createdAt: string) {
  return {
    schemaVersion: "0.1",
    metadata: {
      title: cleanString(draft.metadata.title),
      owner: cleanString(draft.metadata.owner),
      locale: draft.metadata.locale,
      createdAt,
      status: "draft"
    },
    summary: {
      problem: cleanString(draft.summary.problem),
      desiredOutcome: cleanString(draft.summary.desiredOutcome)
    },
    productSpec: {
      goal: {
        statement: cleanString(draft.goal.statement),
        successSignals: cleanList(draft.goal.successSignals)
      },
      impacts: draft.impacts
        .filter((impact) => cleanString(impact.actor) || cleanString(impact.impact))
        .map((impact) => ({ actor: cleanString(impact.actor), impact: cleanString(impact.impact) })),
      deliverables: draft.deliverables
        .filter((deliverable) => cleanString(deliverable.name) || cleanString(deliverable.description))
        .map((deliverable) => ({ name: cleanString(deliverable.name), description: cleanString(deliverable.description) })),
      userActivities: draft.userActivities
        .filter((activity) => cleanString(activity.actor) || cleanString(activity.activity))
        .map((activity) => ({ actor: cleanString(activity.actor), activity: cleanString(activity.activity) })),
      epics: draft.epics
        .filter((epic) => cleanString(epic.title) || epic.stories.length > 0)
        .map((epic) => ({
          title: cleanString(epic.title),
          stories: epic.stories
            .filter((story) => cleanString(story.title) || cleanString(story.userStory))
            .map((story) => ({
              id: story.id,
              title: cleanString(story.title),
              userStory: cleanString(story.userStory),
              acceptanceCriteria: story.acceptanceCriteria
                .filter((criterion) => cleanString(criterion.statement))
                .map((criterion) => ({ id: criterion.id, statement: cleanString(criterion.statement) })),
              examples: story.examples
                .filter((example) => cleanString(example.given) || cleanString(example.when) || cleanString(example.then) || cleanString(example.scenario))
                .map((example) => ({
                  id: example.id,
                  format: example.format,
                  given: cleanString(example.given),
                  when: cleanString(example.when),
                  then: cleanString(example.then),
                  scenario: cleanString(example.scenario)
                }))
            }))
        }))
    },
    agentSpec: {
      nonGoals: cleanList(draft.agentBoundaries.nonGoals),
      constraints: cleanList(draft.agentBoundaries.constraints),
      testExpectations: cleanList(draft.agentBoundaries.testExpectations),
      qualityWarnings: cleanList(draft.agentBoundaries.risks),
      openQuestions: cleanList(draft.agentBoundaries.openQuestions)
    }
  };
}

export function draftToYaml(draft: FeatureDraft, createdAt = new Date().toISOString().slice(0, 10)): string {
  return `${renderYaml(normalizeDraftForExport(draft, createdAt))}\n`;
}
```

- [ ] **Step 5: Run YAML tests**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/yamlSerializer.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit YAML generation**

```bash
git add src/features/spec-wizard/services src/features/spec-wizard/__tests__/yamlSerializer.test.ts
git commit -m "Generate agent-ready YAML from feature drafts

The approved design requires a stable export contract before API or UI layers are useful. This commit adds draft normalization, a small deterministic YAML serializer, and human summary generation without introducing a YAML dependency.

Constraint: YAML keys must stay English across UI locales
Rejected: Add a YAML package immediately | unnecessary for the MVP schema shape and avoidable dependency surface
Confidence: medium
Scope-risk: narrow
Tested: npm test -- src/features/spec-wizard/__tests__/yamlSerializer.test.ts
Not-tested: Browser export interactions"
```

---

### Task 4: Generation API Route

**Files:**
- Create: `src/features/spec-wizard/api/contracts.ts`
- Create: `app/api/generate-spec/route.ts`
- Create: `src/features/spec-wizard/__tests__/generateSpecRoute.test.ts`

- [ ] **Step 1: Write API route tests first**

Create `src/features/spec-wizard/__tests__/generateSpecRoute.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { POST } from "../../../../app/api/generate-spec/route";
import { minimalValidDraft } from "../test/fixtures";

function requestWithBody(body: unknown): Request {
  return new Request("http://localhost/api/generate-spec", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

describe("POST /api/generate-spec", () => {
  it("returns YAML, summary, and validation for a valid draft", async () => {
    const response = await POST(requestWithBody({ draft: minimalValidDraft(), createdAt: "2026-04-26" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.yaml).toContain('schemaVersion: "0.1"');
    expect(json.summary).toContain("Login error message improvement");
    expect(json.validation.blockingErrors).toEqual([]);
  });

  it("returns blocking errors while still returning preview output", async () => {
    const draft = minimalValidDraft();
    draft.metadata.title = "";

    const response = await POST(requestWithBody({ draft, createdAt: "2026-04-26" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.validation.blockingErrors[0].code).toBe("missing_title");
    expect(json.yaml).toContain("metadata:");
  });

  it("rejects invalid JSON payload shape", async () => {
    const response = await POST(requestWithBody({ bad: true }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid request: expected a draft object.");
  });
});
```

- [ ] **Step 2: Run API tests and verify failure**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/generateSpecRoute.test.ts
```

Expected: FAIL because route and contract files do not exist.

- [ ] **Step 3: Create API contracts**

Create `src/features/spec-wizard/api/contracts.ts`:

```ts
import type { FeatureDraft, ValidationResult } from "../model/specTypes";

export type GenerateSpecRequest = {
  draft: FeatureDraft;
  createdAt?: string;
};

export type GenerateSpecResponse = {
  yaml: string;
  summary: string;
  validation: ValidationResult;
};

export type ApiErrorResponse = {
  error: string;
};
```

- [ ] **Step 4: Implement generate-spec route**

Create `app/api/generate-spec/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { ApiErrorResponse, GenerateSpecRequest, GenerateSpecResponse } from "@/features/spec-wizard/api/contracts";
import { validateDraft } from "@/features/spec-wizard/model/validation";
import { buildHumanSummary } from "@/features/spec-wizard/services/summary";
import { draftToYaml } from "@/features/spec-wizard/services/yamlSerializer";

function isGenerateSpecRequest(value: unknown): value is GenerateSpecRequest {
  return typeof value === "object" && value !== null && "draft" in value && typeof (value as GenerateSpecRequest).draft === "object";
}

export async function POST(request: Request): Promise<NextResponse<GenerateSpecResponse | ApiErrorResponse>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request: body must be JSON." }, { status: 400 });
  }

  if (!isGenerateSpecRequest(body)) {
    return NextResponse.json({ error: "Invalid request: expected a draft object." }, { status: 400 });
  }

  const createdAt = body.createdAt ?? new Date().toISOString().slice(0, 10);
  const validation = validateDraft(body.draft);

  return NextResponse.json({
    yaml: draftToYaml(body.draft, createdAt),
    summary: buildHumanSummary(body.draft),
    validation
  });
}
```

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/generateSpecRoute.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit generation API**

```bash
git add app/api/generate-spec src/features/spec-wizard/api src/features/spec-wizard/__tests__/generateSpecRoute.test.ts
git commit -m "Expose deterministic spec generation through an API route

The frontend needs a lightweight API seam for YAML generation and validation so future LLM and backend changes do not leak into form components. This route returns YAML, review summary, and validation for both complete and incomplete drafts.

Constraint: Blocking errors must not destroy preview output or draft export
Confidence: high
Scope-risk: narrow
Tested: npm test -- src/features/spec-wizard/__tests__/generateSpecRoute.test.ts
Not-tested: Network calls from the browser UI"
```

---

### Task 5: i18n Dictionaries and Provider

**Files:**
- Create: `src/features/spec-wizard/i18n/dictionaries.ts`
- Create: `src/features/spec-wizard/i18n/I18nContext.tsx`
- Create: `src/features/spec-wizard/__tests__/i18n.test.tsx`

- [ ] **Step 1: Write i18n tests first**

Create `src/features/spec-wizard/__tests__/i18n.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "../i18n/I18nContext";

function Probe() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <p>{locale}</p>
      <p>{t("wizard.title")}</p>
      <button onClick={() => setLocale("en")}>English</button>
    </div>
  );
}

describe("I18nProvider", () => {
  it("renders Traditional Chinese by default and switches to English", async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByText("敏捷開發路徑 Wizard")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByText("Agile Roadmap Wizard")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run i18n tests and verify failure**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/i18n.test.tsx
```

Expected: FAIL because i18n files do not exist.

- [ ] **Step 3: Create dictionaries**

Create `src/features/spec-wizard/i18n/dictionaries.ts`:

```ts
import type { Locale } from "../model/specTypes";

export type MessageKey =
  | "wizard.title"
  | "wizard.subtitle"
  | "wizard.next"
  | "wizard.previous"
  | "wizard.review"
  | "wizard.exportYaml"
  | "wizard.copyYaml"
  | "wizard.importDraft"
  | "wizard.exportDraft"
  | "field.title"
  | "field.owner"
  | "field.problem"
  | "field.desiredOutcome"
  | "field.goal"
  | "field.successSignals"
  | "field.storyTitle"
  | "field.userStory"
  | "field.constraints"
  | "field.nonGoals"
  | "validation.missingTitle"
  | "validation.missingGoal"
  | "validation.missingStory"
  | "validation.storyMissingAcceptanceCriteria"
  | "validation.storyMissingExamples"
  | "validation.missingConstraints"
  | "validation.missingNonGoals"
  | "validation.vagueSuccessSignal"
  | "validation.openQuestionsPresent";

export const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  "zh-TW": {
    "wizard.title": "敏捷開發路徑 Wizard",
    "wizard.subtitle": "把產品想法轉成可 review、可交給 AI coding agent 的 YAML 規格。",
    "wizard.next": "下一步",
    "wizard.previous": "上一步",
    "wizard.review": "檢視與匯出",
    "wizard.exportYaml": "下載 YAML",
    "wizard.copyYaml": "複製 YAML",
    "wizard.importDraft": "匯入草稿 JSON",
    "wizard.exportDraft": "匯出草稿 JSON",
    "field.title": "功能名稱",
    "field.owner": "負責人",
    "field.problem": "問題背景",
    "field.desiredOutcome": "期望成果",
    "field.goal": "目標",
    "field.successSignals": "成功訊號",
    "field.storyTitle": "故事標題",
    "field.userStory": "使用者故事",
    "field.constraints": "限制",
    "field.nonGoals": "非目標",
    "validation.missingTitle": "請填寫功能名稱。",
    "validation.missingGoal": "請填寫目標。",
    "validation.missingStory": "請至少填寫一個使用者故事。",
    "validation.storyMissingAcceptanceCriteria": "故事缺少驗收條件。",
    "validation.storyMissingExamples": "故事缺少範例。",
    "validation.missingConstraints": "建議補充限制條件。",
    "validation.missingNonGoals": "建議補充非目標。",
    "validation.vagueSuccessSignal": "成功訊號可能過於模糊。",
    "validation.openQuestionsPresent": "仍有未解問題。"
  },
  en: {
    "wizard.title": "Agile Roadmap Wizard",
    "wizard.subtitle": "Turn product ideas into reviewable YAML specs for AI coding agents.",
    "wizard.next": "Next",
    "wizard.previous": "Previous",
    "wizard.review": "Review and Export",
    "wizard.exportYaml": "Download YAML",
    "wizard.copyYaml": "Copy YAML",
    "wizard.importDraft": "Import Draft JSON",
    "wizard.exportDraft": "Export Draft JSON",
    "field.title": "Feature title",
    "field.owner": "Owner",
    "field.problem": "Problem background",
    "field.desiredOutcome": "Desired outcome",
    "field.goal": "Goal",
    "field.successSignals": "Success signals",
    "field.storyTitle": "Story title",
    "field.userStory": "User story",
    "field.constraints": "Constraints",
    "field.nonGoals": "Non-goals",
    "validation.missingTitle": "Enter a feature title.",
    "validation.missingGoal": "Enter a goal.",
    "validation.missingStory": "Enter at least one user story.",
    "validation.storyMissingAcceptanceCriteria": "Story is missing acceptance criteria.",
    "validation.storyMissingExamples": "Story is missing examples.",
    "validation.missingConstraints": "Add constraints if any apply.",
    "validation.missingNonGoals": "Add non-goals if any apply.",
    "validation.vagueSuccessSignal": "Success signal may be too vague.",
    "validation.openQuestionsPresent": "Open questions remain."
  }
};
```

- [ ] **Step 4: Create provider**

Create `src/features/spec-wizard/i18n/I18nContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Locale } from "../model/specTypes";
import { dictionaries, type MessageKey } from "./dictionaries";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("zh-TW");

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key) => dictionaries[locale][key]
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
```

- [ ] **Step 5: Run i18n tests**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/i18n.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit i18n layer**

```bash
git add src/features/spec-wizard/i18n src/features/spec-wizard/__tests__/i18n.test.tsx
git commit -m "Add bilingual UI messaging for the wizard

The Wizard needs Traditional Chinese for non-technical stakeholders and English for engineering and agent workflows. This commit adds a small typed i18n layer while keeping YAML keys independent from UI language.

Constraint: YAML keys must remain English regardless of selected locale
Confidence: high
Scope-risk: narrow
Tested: npm test -- src/features/spec-wizard/__tests__/i18n.test.tsx
Not-tested: Full Wizard language switching"
```

---

### Task 6: Draft Persistence

**Files:**
- Create: `src/features/spec-wizard/persistence/draftStorage.ts`
- Create: `src/features/spec-wizard/__tests__/draftStorage.test.ts`

- [ ] **Step 1: Write persistence tests first**

Create `src/features/spec-wizard/__tests__/draftStorage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { clearDraft, loadDraft, saveDraft } from "../persistence/draftStorage";
import { minimalValidDraft } from "../test/fixtures";

describe("draftStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads a draft", () => {
    const draft = minimalValidDraft();

    saveDraft(draft);

    expect(loadDraft()).toEqual(draft);
  });

  it("returns null when storage is empty", () => {
    expect(loadDraft()).toBeNull();
  });

  it("clears a stored draft", () => {
    saveDraft(minimalValidDraft());

    clearDraft();

    expect(loadDraft()).toBeNull();
  });

  it("returns null for invalid stored JSON", () => {
    localStorage.setItem("vector.featureDraft.v1", "not-json");

    expect(loadDraft()).toBeNull();
  });
});
```

- [ ] **Step 2: Run persistence tests and verify failure**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/draftStorage.test.ts
```

Expected: FAIL because persistence file does not exist.

- [ ] **Step 3: Implement localStorage helpers**

Create `src/features/spec-wizard/persistence/draftStorage.ts`:

```ts
import type { FeatureDraft } from "../model/specTypes";

export const DRAFT_STORAGE_KEY = "vector.featureDraft.v1";

export function saveDraft(draft: FeatureDraft): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function loadDraft(): FeatureDraft | null {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FeatureDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function draftToJson(draft: FeatureDraft): string {
  return JSON.stringify(draft, null, 2);
}

export function draftFromJson(raw: string): FeatureDraft {
  const parsed = JSON.parse(raw) as FeatureDraft;
  if (!parsed.metadata || !parsed.goal || !Array.isArray(parsed.epics)) {
    throw new Error("Invalid draft JSON");
  }
  return parsed;
}
```

- [ ] **Step 4: Run persistence tests**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/draftStorage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit persistence layer**

```bash
git add src/features/spec-wizard/persistence src/features/spec-wizard/__tests__/draftStorage.test.ts
git commit -m "Persist wizard drafts locally without backend storage

The MVP intentionally avoids login and databases, so browser storage and JSON draft portability provide the needed save-and-resume path. This commit adds focused persistence helpers that the UI can call without knowing storage keys.

Constraint: MVP data persistence is localStorage plus JSON import/export only
Confidence: high
Scope-risk: narrow
Tested: npm test -- src/features/spec-wizard/__tests__/draftStorage.test.ts
Not-tested: Browser quota failure handling in a real browser"
```

---

### Task 7: Wizard UI and Review Flow

**Files:**
- Create: `src/features/spec-wizard/components/FieldArray.tsx`
- Create: `src/features/spec-wizard/components/WizardStep.tsx`
- Create: `src/features/spec-wizard/components/ReviewPanel.tsx`
- Create: `src/features/spec-wizard/components/Wizard.tsx`
- Create: `src/features/spec-wizard/__tests__/wizardFlow.test.tsx`

- [ ] **Step 1: Write Wizard flow tests first**

Create `src/features/spec-wizard/__tests__/wizardFlow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { Wizard } from "../components/Wizard";

function renderWizard() {
  return render(
    <I18nProvider>
      <Wizard />
    </I18nProvider>
  );
}

describe("Wizard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("walks from basic info to review and renders YAML", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("功能名稱"), "會員登入錯誤提示優化");
    await user.type(screen.getByLabelText("負責人"), "PM Team");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.type(screen.getByLabelText("問題背景"), "登入錯誤訊息太籠統。");
    await user.type(screen.getByLabelText("期望成果"), "降低客服詢問。");
    await user.type(screen.getByLabelText("目標"), "讓使用者知道登入失敗後該怎麼做。");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.type(screen.getByLabelText("故事標題"), "顯示安全的登入失敗提示");
    await user.type(screen.getByLabelText("使用者故事"), "作為會員，我想看到清楚提示，以便知道如何修正。");
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    await user.type(screen.getByLabelText("限制"), "不可透露帳號是否存在");
    await user.type(screen.getByLabelText("非目標"), "不新增社群登入");
    await user.click(screen.getByRole("button", { name: "檢視與匯出" }));

    expect(screen.getByText("schemaVersion:")).toBeInTheDocument();
    expect(screen.getByText(/會員登入錯誤提示優化/)).toBeInTheDocument();
  });

  it("can go back to edit a previous step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("功能名稱"), "Initial title");
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "上一步" }));

    expect(screen.getByDisplayValue("Initial title")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run Wizard tests and verify failure**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/wizardFlow.test.tsx
```

Expected: FAIL because components do not exist.

- [ ] **Step 3: Create reusable FieldArray**

Create `src/features/spec-wizard/components/FieldArray.tsx`:

```tsx
"use client";

type FieldArrayProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
};

export function FieldArray({ label, values, onChange }: FieldArrayProps) {
  const normalizedValues = values.length > 0 ? values : [""];

  return (
    <div className="field">
      <label>{label}</label>
      {normalizedValues.map((value, index) => (
        <input
          aria-label={`${label} ${index + 1}`}
          key={index}
          value={value}
          onChange={(event) => {
            const next = [...normalizedValues];
            next[index] = event.target.value;
            onChange(next);
          }}
        />
      ))}
      <button className="secondary" type="button" onClick={() => onChange([...normalizedValues, ""])}>
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create WizardStep wrapper**

Create `src/features/spec-wizard/components/WizardStep.tsx`:

```tsx
"use client";

export function WizardStep({ title, method, children }: { title: string; method?: string; children: React.ReactNode }) {
  return (
    <section className="panel stack">
      <div>
        <h2>{title}</h2>
        {method ? <small>{method}</small> : null}
      </div>
      {children}
    </section>
  );
}
```

- [ ] **Step 5: Create ReviewPanel**

Create `src/features/spec-wizard/components/ReviewPanel.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { FeatureDraft } from "../model/specTypes";
import { validateDraft } from "../model/validation";
import { buildHumanSummary } from "../services/summary";
import { draftToYaml } from "../services/yamlSerializer";
import { draftToJson } from "../persistence/draftStorage";
import { useI18n } from "../i18n/I18nContext";

type ReviewPanelProps = {
  draft: FeatureDraft;
};

export function ReviewPanel({ draft }: ReviewPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"summary" | "yaml">("summary");
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const summary = useMemo(() => buildHumanSummary(draft), [draft]);
  const yaml = useMemo(() => draftToYaml(draft), [draft]);

  return (
    <section className="panel stack">
      <h2>{t("wizard.review")}</h2>
      {validation.blockingErrors.length > 0 ? (
        <div className="error">
          {validation.blockingErrors.map((issue) => (
            <p key={issue.code}>{t(issue.messageKey as never)}</p>
          ))}
        </div>
      ) : null}
      {validation.warnings.length > 0 ? (
        <div className="warning">
          {validation.warnings.map((issue, index) => (
            <p key={`${issue.code}-${index}`}>{t(issue.messageKey as never)}</p>
          ))}
        </div>
      ) : null}
      <div className="button-row">
        <button className="secondary" type="button" onClick={() => setTab("summary")}>Summary</button>
        <button className="secondary" type="button" onClick={() => setTab("yaml")}>YAML</button>
        <button type="button" disabled={validation.blockingErrors.length > 0} onClick={() => navigator.clipboard?.writeText(yaml)}>
          {t("wizard.copyYaml")}
        </button>
        <a href={`data:text/yaml;charset=utf-8,${encodeURIComponent(yaml)}`} download={`${draft.metadata.title || "feature-spec"}.yaml`}>
          {t("wizard.exportYaml")}
        </a>
        <a href={`data:application/json;charset=utf-8,${encodeURIComponent(draftToJson(draft))}`} download={`${draft.metadata.title || "feature-draft"}.json`}>
          {t("wizard.exportDraft")}
        </a>
      </div>
      <pre>{tab === "summary" ? summary : yaml}</pre>
    </section>
  );
}
```

- [ ] **Step 6: Create Wizard component**

Create `src/features/spec-wizard/components/Wizard.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { createEmptyDraft } from "../model/defaultDraft";
import type { FeatureDraft } from "../model/specTypes";
import { draftFromJson, loadDraft, saveDraft } from "../persistence/draftStorage";
import { FieldArray } from "./FieldArray";
import { ReviewPanel } from "./ReviewPanel";
import { WizardStep } from "./WizardStep";

const steps = ["basic", "goal", "context", "deliverables", "stories", "criteria", "examples", "boundaries", "review"] as const;
type Step = (typeof steps)[number];

function updateStory(draft: FeatureDraft, patch: Partial<FeatureDraft["epics"][number]["stories"][number]>): FeatureDraft {
  return {
    ...draft,
    epics: draft.epics.map((epic, epicIndex) =>
      epicIndex === 0
        ? {
            ...epic,
            stories: epic.stories.map((story, storyIndex) => (storyIndex === 0 ? { ...story, ...patch } : story))
          }
        : epic
    )
  };
}

export function Wizard() {
  const { locale, setLocale, t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<FeatureDraft>(() => createEmptyDraft(locale));

  useEffect(() => {
    const stored = loadDraft();
    if (stored) setDraft(stored);
  }, []);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const step = steps[stepIndex];
  const firstStory = draft.epics[0].stories[0];

  const content = useMemo(() => {
    if (step === "basic") {
      return (
        <WizardStep title="基本資訊">
          <div className="field">
            <label htmlFor="title">{t("field.title")}</label>
            <input id="title" value={draft.metadata.title} onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, title: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="owner">{t("field.owner")}</label>
            <input id="owner" value={draft.metadata.owner} onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, owner: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="locale">Language</label>
            <select
              id="locale"
              value={locale}
              onChange={(event) => {
                const nextLocale = event.target.value as FeatureDraft["metadata"]["locale"];
                setLocale(nextLocale);
                setDraft({ ...draft, metadata: { ...draft.metadata, locale: nextLocale } });
              }}
            >
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="draftImport">{t("wizard.importDraft")}</label>
            <input
              id="draftImport"
              type="file"
              accept="application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setDraft(draftFromJson(await file.text()));
              }}
            />
          </div>
        </WizardStep>
      );
    }

    if (step === "goal") {
      return (
        <WizardStep title="目標與影響" method="Impact Mapping">
          <div className="field">
            <label htmlFor="problem">{t("field.problem")}</label>
            <textarea id="problem" value={draft.summary.problem} onChange={(event) => setDraft({ ...draft, summary: { ...draft.summary, problem: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="desiredOutcome">{t("field.desiredOutcome")}</label>
            <textarea id="desiredOutcome" value={draft.summary.desiredOutcome} onChange={(event) => setDraft({ ...draft, summary: { ...draft.summary, desiredOutcome: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="goal">{t("field.goal")}</label>
            <textarea id="goal" value={draft.goal.statement} onChange={(event) => setDraft({ ...draft, goal: { ...draft.goal, statement: event.target.value } })} />
          </div>
          <FieldArray label={t("field.successSignals")} values={draft.goal.successSignals} onChange={(successSignals) => setDraft({ ...draft, goal: { ...draft.goal, successSignals } })} />
        </WizardStep>
      );
    }

    if (step === "stories") {
      return (
        <WizardStep title="使用者故事" method="Story Mapping">
          <div className="field">
            <label htmlFor="storyTitle">{t("field.storyTitle")}</label>
            <input id="storyTitle" value={firstStory.title} onChange={(event) => setDraft(updateStory(draft, { title: event.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="userStory">{t("field.userStory")}</label>
            <textarea id="userStory" value={firstStory.userStory} onChange={(event) => setDraft(updateStory(draft, { userStory: event.target.value }))} />
          </div>
        </WizardStep>
      );
    }

    if (step === "boundaries") {
      return (
        <WizardStep title="限制、非目標與風險">
          <div className="field">
            <label htmlFor="constraints">{t("field.constraints")}</label>
            <textarea id="constraints" value={draft.agentBoundaries.constraints[0] ?? ""} onChange={(event) => setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, constraints: [event.target.value] } })} />
          </div>
          <div className="field">
            <label htmlFor="nonGoals">{t("field.nonGoals")}</label>
            <textarea id="nonGoals" value={draft.agentBoundaries.nonGoals[0] ?? ""} onChange={(event) => setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, nonGoals: [event.target.value] } })} />
          </div>
        </WizardStep>
      );
    }

    if (step === "review") return <ReviewPanel draft={draft} />;

    return (
      <WizardStep title="可選補充" method={step === "criteria" || step === "examples" ? "Specification by Example" : "Story Mapping"}>
        <p>此步驟可先略過；MVP 允許稍後補充。</p>
      </WizardStep>
    );
  }, [draft, firstStory.title, firstStory.userStory, locale, setLocale, step, t]);

  return (
    <div className="stack">
      <header>
        <h1>{t("wizard.title")}</h1>
        <p>{t("wizard.subtitle")}</p>
      </header>
      {content}
      <nav className="button-row">
        <button className="secondary" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
          {t("wizard.previous")}
        </button>
        {stepIndex < steps.length - 1 ? (
          <button type="button" onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}>
            {stepIndex === steps.length - 2 ? t("wizard.review") : t("wizard.next")}
          </button>
        ) : null}
      </nav>
    </div>
  );
}
```

- [ ] **Step 7: Run Wizard flow tests**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/wizardFlow.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Wizard UI**

```bash
git add src/features/spec-wizard/components src/features/spec-wizard/__tests__/wizardFlow.test.tsx app/page.tsx
git commit -m "Build the guided wizard review flow

The product spec depends on a linear Wizard that non-technical users can complete and revise. This commit adds the core UI flow, local draft persistence integration, minimal form steps, and review output for human summary plus YAML.

Constraint: MVP is linear-first but must allow previous-step edits
Confidence: medium
Scope-risk: moderate
Tested: npm test -- src/features/spec-wizard/__tests__/wizardFlow.test.tsx
Not-tested: Full visual polish and download interactions"
```

---

### Task 8: Mock AI Assist API

**Files:**
- Create: `src/features/spec-wizard/services/assistService.ts`
- Create: `app/api/assist/route.ts`
- Create: `src/features/spec-wizard/__tests__/assistService.test.ts`

- [ ] **Step 1: Write assist service tests first**

Create `src/features/spec-wizard/__tests__/assistService.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assistDraft } from "../services/assistService";
import { minimalValidDraft } from "../test/fixtures";

describe("assistDraft", () => {
  it("rewrites text without adding product decisions", async () => {
    const response = await assistDraft({ mode: "rewrite", locale: "en", text: "login error bad user confused" });

    expect(response.suggestedText).toBe("Clarify the login error so users understand the next recovery step.");
    expect(response.assumptions).toEqual([]);
  });

  it("returns quality warnings for incomplete drafts", async () => {
    const draft = minimalValidDraft();
    draft.agentBoundaries.constraints = [];

    const response = await assistDraft({ mode: "quality_check", locale: "en", draft });

    expect(response.warnings).toContain("Add constraints so the coding agent does not over-implement or expose unsafe behavior.");
    expect(response.openQuestions).toContain("Are there security, privacy, or compliance constraints for this feature?");
  });
});
```

- [ ] **Step 2: Run assist tests and verify failure**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/assistService.test.ts
```

Expected: FAIL because assist service does not exist.

- [ ] **Step 3: Implement mock assist service**

Create `src/features/spec-wizard/services/assistService.ts`:

```ts
import type { FeatureDraft, Locale } from "../model/specTypes";

type AssistMode = "rewrite" | "quality_check";

export type AssistRequest = {
  mode: AssistMode;
  locale: Locale;
  fieldPath?: string;
  text?: string;
  draft?: FeatureDraft;
};

export type AssistResponse = {
  suggestedText?: string;
  rationale?: string;
  warnings: string[];
  assumptions: string[];
  openQuestions: string[];
};

export async function assistDraft(request: AssistRequest): Promise<AssistResponse> {
  if (request.mode === "rewrite") {
    return {
      suggestedText:
        request.locale === "zh-TW"
          ? "釐清登入錯誤提示，讓使用者知道下一步該如何復原。"
          : "Clarify the login error so users understand the next recovery step.",
      rationale:
        request.locale === "zh-TW"
          ? "改寫只整理語意，不新增未確認需求。"
          : "The rewrite clarifies wording without adding unconfirmed requirements.",
      warnings: [],
      assumptions: [],
      openQuestions: []
    };
  }

  const warnings: string[] = [];
  const openQuestions: string[] = [];
  const draft = request.draft;

  if (draft && draft.agentBoundaries.constraints.filter((item) => item.trim()).length === 0) {
    warnings.push(
      request.locale === "zh-TW"
        ? "請加入限制條件，避免 coding agent 過度實作或暴露不安全行為。"
        : "Add constraints so the coding agent does not over-implement or expose unsafe behavior."
    );
    openQuestions.push(
      request.locale === "zh-TW"
        ? "這個功能是否有資安、隱私或法遵限制？"
        : "Are there security, privacy, or compliance constraints for this feature?"
    );
  }

  return {
    rationale:
      request.locale === "zh-TW"
        ? "品質檢查只指出缺漏與風險，不會修改草稿。"
        : "Quality checks identify gaps and risks without changing the draft.",
    warnings,
    assumptions: [],
    openQuestions
  };
}
```

- [ ] **Step 4: Implement assist API route**

Create `app/api/assist/route.ts`:

```ts
import { NextResponse } from "next/server";
import { assistDraft, type AssistRequest, type AssistResponse } from "@/features/spec-wizard/services/assistService";
import type { ApiErrorResponse } from "@/features/spec-wizard/api/contracts";

function isAssistRequest(value: unknown): value is AssistRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as AssistRequest;
  return (candidate.mode === "rewrite" || candidate.mode === "quality_check") && (candidate.locale === "zh-TW" || candidate.locale === "en");
}

export async function POST(request: Request): Promise<NextResponse<AssistResponse | ApiErrorResponse>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request: body must be JSON." }, { status: 400 });
  }

  if (!isAssistRequest(body)) {
    return NextResponse.json({ error: "Invalid request: expected assist mode and locale." }, { status: 400 });
  }

  return NextResponse.json(await assistDraft(body));
}
```

- [ ] **Step 5: Run assist tests**

Run:

```bash
npm test -- src/features/spec-wizard/__tests__/assistService.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit assist API**

```bash
git add src/features/spec-wizard/services/assistService.ts app/api/assist src/features/spec-wizard/__tests__/assistService.test.ts
git commit -m "Add optional mock AI assistance behind an API seam

The MVP should support AI-assisted rewrite and quality checks without making LLMs part of the critical path. This commit adds a deterministic mock adapter and route so UI integration and tests can proceed before choosing a real provider.

Constraint: AI must not directly mutate drafts or invent product decisions
Rejected: Generate stories and acceptance criteria automatically | conflicts with the approved MVP boundary
Confidence: medium
Scope-risk: narrow
Tested: npm test -- src/features/spec-wizard/__tests__/assistService.test.ts
Not-tested: Real LLM provider behavior"
```

---

### Task 9: Final Verification and Build Readiness

**Files:**
- Modify: `docs/superpowers/specs/2026-04-26-agile-roadmap-wizard-design.md` only if implementation reveals a mismatch that must be documented.
- No new source files expected.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS for all tests.

- [ ] **Step 2: Run TypeScript and production build**

Run:

```bash
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 3: Run lint if available**

Run:

```bash
npm run lint
```

Expected: PASS, or Next.js prompts to configure linting. If it prompts, add the default Next.js ESLint config and rerun until lint passes.

- [ ] **Step 4: Manually smoke-test the app**

Run:

```bash
npm run dev
```

Expected: Next.js starts on `http://localhost:3000`.

Manual path:

1. Open `http://localhost:3000`.
2. Fill title, owner, problem, desired outcome, goal, story title, user story, constraint, and non-goal.
3. Navigate to Review.
4. Confirm Summary tab contains the title and goal.
5. Confirm YAML tab contains `schemaVersion: "0.1"`, `productSpec`, and `agentSpec`.
6. Refresh the browser.
7. Confirm the draft restores from localStorage.

- [ ] **Step 5: Check git status**

Run:

```bash
git status --short
```

Expected: only intended files are modified or untracked.

- [ ] **Step 6: Commit final verification fixes if any were needed**

If any build, lint, or test fixes were required, commit them:

```bash
git add .
git commit -m "Stabilize the agile roadmap wizard for MVP verification

Final verification exposed small integration issues after the feature slices came together. This commit keeps the implementation aligned with the approved MVP behavior and confirms the app can be tested and built as a coherent tool.

Constraint: Completion requires tests and build evidence before handoff
Confidence: high
Scope-risk: narrow
Tested: npm test; npm run build; npm run lint
Not-tested: Production deployment environment"
```

If no fixes were required, do not create an empty commit.

---

## Plan Self-Review

### Spec coverage

- Single-user Wizard: Task 7.
- Single Feature Spec granularity: Tasks 2, 3, and 7.
- Linear flow with previous-step edits: Task 7.
- YAML export schema: Task 3.
- Human summary: Task 3 and Task 7.
- localStorage autosave: Task 6 and Task 7.
- JSON draft import/export: Task 6 provides conversion helpers; Task 7 adds file import and JSON download controls.
- i18n zh-TW/en: Task 5.
- Lightweight API: Task 4 and Task 8.
- Optional AI rewrite/quality check: Task 8.
- Loose validation: Task 2.
- Tests: each implementation task starts with tests; Task 9 runs full verification.

### Placeholder scan

This plan avoids unresolved placeholder markers and vague implementation directives. Each task lists concrete files, commands, expected results, and code to write.

### Type consistency

The plan consistently uses `FeatureDraft`, `Locale`, `ValidationResult`, `AssistRequest`, and `AssistResponse`. YAML generation consumes `FeatureDraft`; validation and summary share the same model.
