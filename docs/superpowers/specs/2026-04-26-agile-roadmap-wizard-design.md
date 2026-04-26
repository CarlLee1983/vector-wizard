# Agile Roadmap Wizard Design

Date: 2026-04-26
Status: Approved for planning
Project: Vector

## 1. Purpose

Build a guided Wizard that turns the agile product-owner roadmap shown in the reference image into a lightweight front-end tool. The tool lets non-technical stakeholders participate in product decisions and produces a structured YAML feature specification that an AI coding agent, human engineer, PM, PO, or QA reviewer can use.

The MVP focuses on a single-user, single-feature workflow. It should prove two outcomes:

1. A non-technical user can complete a feature spec without needing to understand agile terminology deeply.
2. The exported YAML is structured enough for an AI coding agent to use as input for implementation planning.

## 2. Product Scope

### In scope for MVP

- Single-user guided Wizard.
- Single Feature Spec granularity.
- Linear flow with the ability to go back and edit previous steps.
- Human-readable review summary.
- Single YAML export for coding agents and engineers.
- Browser localStorage autosave.
- Draft JSON import/export.
- Traditional Chinese and English UI support.
- Lightweight API for YAML generation, validation, and optional AI assistance.
- Optional AI assistance for rewriting and quality checks.
- Loose validation that favors completion over process rigidity.

### Out of scope for MVP

- User login.
- Multi-user real-time collaboration.
- Backend database persistence.
- Workspaces or project management.
- Version history.
- Permission management.
- Automatic generation of full stories, acceptance criteria, or examples.
- Automatic inference of implementation details, file paths, database schema, or technical architecture.
- GitHub issue or PR creation.
- Direct triggering of a coding agent.
- Public SaaS concerns such as billing, audit logs, and data-retention policy.

## 3. User Flow

The Wizard uses friendly product-language labels while preserving the educational value of the agile methods behind the reference roadmap.

1. **Basic Information**
   - Feature title.
   - Owner.
   - Background description.
   - UI language.

2. **Goal and Impact**
   - Method tag: Impact Mapping.
   - Captures why the feature matters, desired outcome, success signals, and affected actors.

3. **Users and Context**
   - Method tag: Story Mapping.
   - Captures primary users, usage context, and user activities.

4. **Deliverables and Stories**
   - Method tag: Story Mapping.
   - Captures deliverables, epics, and at least one user story.

5. **Acceptance Criteria**
   - Method tag: Specification by Example.
   - Captures criteria for each story. Criteria are recommended but not required for draft export.

6. **Examples**
   - Method tag: Specification by Example.
   - Captures Given/When/Then examples or natural-language scenarios.

7. **Constraints, Non-goals, and Risks**
   - Captures boundaries that prevent over-implementation.
   - Includes constraints, non-goals, risks, open questions, and test expectations.

8. **Review and Export**
   - Shows two tabs:
     - Review Summary for humans.
     - YAML Spec for coding agents and engineers.
   - Supports copy YAML, download YAML, export JSON draft, and import JSON draft.

## 4. System Architecture

The MVP uses Next.js, React, and TypeScript in a single application. This keeps delivery fast for an internal tool while preserving clear seams for future SaaS, open-source, or backend expansion.

### Frontend modules

#### Wizard Shell

Responsibilities:

- Track current step.
- Support next and previous navigation.
- Show progress and method tags.
- Prevent final YAML download only when blocking validation errors exist.

#### Form Sections

Each step owns one focused form section. Shared field components should cover:

- Text input.
- Textarea.
- Repeatable list.
- Story editor.
- Acceptance criteria editor.
- Example editor.

The frontend should manipulate a structured TypeScript draft model, not YAML strings.

#### Draft Persistence

Responsibilities:

- Autosave draft to localStorage.
- Restore draft after refresh.
- Export JSON draft.
- Import JSON draft.

The draft format should be separate from the final YAML schema so future migrations remain possible.

#### Review Panel

Responsibilities:

- Generate or request the latest normalized spec.
- Display human-readable summary.
- Display YAML spec.
- Show blocking errors and warnings.
- Support copy and download actions.

#### i18n Layer

Requirements:

- MVP supports Traditional Chinese and English.
- UI labels, helper text, validation messages, and summary text use i18n.
- YAML keys remain English regardless of UI language.

### API modules

#### Spec Generation API

Responsibilities:

- Receive frontend draft.
- Normalize data.
- Return YAML.
- Return validation warnings and blocking errors.

#### Schema Validation API

Responsibilities:

- Apply loose validation rules.
- Return blocking errors for missing title, missing goal statement, or missing story.
- Return warnings for incomplete but allowed sections.

#### LLM Assist API

Responsibilities:

- Provide optional assistance.
- Support rewrite and quality-check modes.
- Never become required for Wizard completion.
- Never directly mutate the draft.

#### LLM Provider Adapter

The API should not bind directly to one provider. It should expose a provider interface that can support a mock provider first and later support OpenAI, Anthropic, or another provider.

Conceptual interface:

```ts
type AssistMode = "rewrite" | "quality_check";

type AssistRequest = {
  mode: AssistMode;
  locale: "zh-TW" | "en";
  fieldPath?: string;
  text?: string;
  draft?: FeatureDraft;
};

type AssistResponse = {
  suggestedText?: string;
  rationale?: string;
  warnings: string[];
  assumptions: string[];
  openQuestions: string[];
};
```

## 5. Data Model

### Draft model

The frontend works with a structured draft model similar to:

```ts
type FeatureDraft = {
  metadata: {
    title: string;
    owner?: string;
    locale: "zh-TW" | "en";
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
```

The exact `Impact`, `Deliverable`, `UserActivity`, and `Epic` types can be defined during implementation planning, but each should remain small, serializable, and easy to validate.

### YAML schema

The YAML uses a mixed product-and-agent schema. `productSpec` describes product intent and completion criteria. `agentSpec` describes boundaries and execution expectations for AI coding agents.

Example structure:

```yaml
schemaVersion: "0.1"
metadata:
  title: "會員登入錯誤提示優化"
  owner: "PM Team"
  locale: "zh-TW"
  createdAt: "2026-04-26"
  status: "draft"

summary:
  problem: "目前登入錯誤訊息過於籠統，使用者不知道如何修正。"
  desiredOutcome: "降低登入失敗後的客服詢問量。"

productSpec:
  goal:
    statement: "讓使用者在登入失敗時知道下一步該怎麼做。"
    successSignals:
      - "登入失敗後重試成功率提升"
      - "相關客服詢問下降"

  impacts:
    - actor: "一般會員"
      impact: "能理解錯誤原因並自行修正"

  deliverables:
    - name: "登入錯誤提示"
      description: "針對常見登入失敗原因顯示明確訊息"

  userActivities:
    - actor: "一般會員"
      activity: "輸入帳號密碼並嘗試登入"

  epics:
    - title: "登入體驗改善"
      stories:
        - id: "US-001"
          title: "顯示帳號或密碼錯誤提示"
          userStory: "作為一般會員，我想在登入失敗時看到清楚提示，以便知道如何修正。"
          acceptanceCriteria:
            - id: "AC-001"
              statement: "當帳號或密碼錯誤時，畫面顯示不透露安全細節的錯誤訊息。"
          examples:
            - id: "EX-001"
              format: "given-when-then"
              given: "使用者位於登入頁"
              when: "輸入錯誤密碼並送出"
              then: "系統顯示登入失敗提示，且不指出帳號是否存在"

agentSpec:
  nonGoals:
    - "不重新設計完整登入流程"
    - "不新增社群登入"
  constraints:
    - "錯誤訊息不可洩漏帳號是否存在"
  testExpectations:
    - "應測試帳號不存在、密碼錯誤、帳號鎖定等情境"
  qualityWarnings:
    - "若缺少安全限制，agent 不應自行假設可顯示詳細錯誤原因"
  openQuestions:
    - "帳號鎖定狀態的錯誤文案是否已有法務/資安規範？"
```

Rules:

- YAML keys are always English.
- IDs can be generated by the system.
- `schemaVersion` starts at `0.1`.
- `agentSpec` must not infer concrete files, framework-specific implementation details, database design, or unconfirmed product decisions.

## 6. Validation Strategy

Validation is intentionally loose so users can complete a draft without being blocked by every missing detail.

### Blocking errors

- Missing `metadata.title`.
- Missing `productSpec.goal.statement`.
- No user story exists.

### Warnings

- Story lacks acceptance criteria.
- Story lacks examples.
- Missing constraints.
- Missing non-goals.
- Success signal is vague.
- Open questions remain unresolved.
- Security, privacy, or compliance constraints appear relevant but are absent.

Warnings do not block draft save or YAML preview. Blocking errors prevent final YAML download but should still allow JSON draft export.

## 7. AI Assistance Design

AI is optional and non-authoritative. It assists expression and review; it does not make product decisions.

### MVP AI modes

#### Rewrite

- Rewrites user-provided text into clearer spec language.
- Preserves intent.
- Does not add unconfirmed requirements.
- Returns suggested text for manual acceptance.

#### Quality check

- Finds missing details, vague wording, risks, assumptions, and open questions.
- Returns warnings and questions.
- Does not mutate the draft automatically.

### AI interaction rules

- AI suggestions require user acceptance.
- AI must not directly add stories, acceptance criteria, examples, or product decisions.
- Any inferred requirement must appear as an assumption, warning, or open question.
- AI failure must not block the Wizard.
- API keys must remain server-side.
- Before LLM calls, the UI should make clear which content will be sent.

## 8. Error Handling

### YAML generation failure

- Preserve the draft.
- Show a user-friendly error.
- Provide expandable technical details for debugging.

### Validation warnings

- Show warnings on the Review page.
- Link warnings back to relevant steps where possible.
- Allow export if no blocking errors exist.

### Blocking validation errors

- Prevent final YAML download.
- Allow draft JSON export.
- Explain exactly what must be added.

### AI API failure

- Show that AI assistance is temporarily unavailable.
- Continue allowing manual Wizard completion and YAML export.

### localStorage failure

- Warn that autosave is unavailable.
- Encourage manual JSON draft export.

## 9. Testing Strategy

### Model and YAML tests

- Minimal valid draft generates valid YAML.
- Multiple stories, criteria, and examples serialize correctly.
- YAML keys stay English across locales.
- Empty optional fields do not produce broken YAML.
- `schemaVersion`, `metadata`, `productSpec`, and `agentSpec` exist.

### Validation tests

- Missing title returns blocking error.
- Missing goal returns blocking error.
- Missing story returns blocking error.
- Missing acceptance criteria returns warning.
- Missing examples returns warning.
- Missing constraints and non-goals return warnings.

### Wizard flow tests

- User can complete the Wizard from first step to Review.
- User can go back and edit previous steps.
- Draft autosaves to localStorage.
- Refresh restores draft.
- JSON draft import/export works.
- YAML copy/download works.

### i18n tests

- UI labels switch between Traditional Chinese and English.
- Helper text switches between locales.
- Validation messages switch between locales.
- YAML keys do not change with locale.

### API and AI-assist tests

- Rewrite returns suggested text and rationale.
- Quality check returns warnings, assumptions, and open questions.
- AI API failure does not block Wizard flow.
- Mock provider can replace a real provider.
- AI never directly mutates the draft.

## 10. MVP Completion Criteria

The MVP is complete when:

- A user can complete a single Feature Spec through the Wizard.
- The minimum required data is title, goal, and at least one story.
- The Review page shows both human-readable summary and YAML spec.
- YAML conforms to `schemaVersion: "0.1"`.
- localStorage autosave works.
- JSON draft import/export works.
- Traditional Chinese and English UI are available.
- AI rewrite and quality-check flows work through at least a mock provider or provider adapter.
- Tests cover model conversion, validation, main Wizard flow, i18n, and AI failure handling.

## 11. Deferred Decisions for Implementation Planning

These decisions do not block the design but should be resolved in the implementation plan:

- First real LLM provider: OpenAI, Anthropic, or mock-only for first iteration.
- UI component library: shadcn/ui, MUI, or simple custom components.
- YAML download filename format.
- Whether to include starter templates such as login, reporting, or admin-operation examples.
- Internal deployment target: Vercel, Docker, or company server.

## 12. Recommended Implementation Slice

A practical first implementation sequence:

1. Project foundation with Next.js, TypeScript, testing, and i18n.
2. Draft domain model and validation.
3. Wizard shell and core steps.
4. localStorage autosave and JSON import/export.
5. YAML generation and Review page.
6. Mock AI assist adapter and API.
7. Test coverage for core flows.
