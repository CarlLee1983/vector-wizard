# Vector Agile Roadmap Wizard

English | [繁體中文](README.zh-TW.md)

Vector is a high-density, professional technical design tool that bridges the gap between non-technical decision-makers and AI coding agents. It walks users through an agile roadmap interview and exports an AI-ready YAML feature specification.

## 🚀 Key Features

- **Interactive Spec Wizard**: A guided interview process to capture requirements, user stories, and acceptance criteria.
- **AI-Ready Export**: Generates structured YAML specifications optimized for consumption by AI agents (e.g., Claude Code, Cursor, Copilot).
- **Dual-Path Methodology**:
  - **Path A (Reverse)**: Use `vector-analyzer` to turn existing code into structured specs.
  - **Path B (Forward)**: Use `vector-pipeline-b` to turn raw system ideas into feature seeds.
- **AI Assistant**: Built-in quality checks and refinement suggestions to ensure specs are comprehensive and unambiguous.
- **Human-Readable Summaries**: Exports clean Markdown summaries for team reviews.
- **Draft Management**: Automatic persistence in `localStorage` with support for JSON import/export.
- **Multi-language Support**: Full support for Traditional Chinese (Taiwan) and English.
- **Paper-like Design System**: A warm, high-density UI inspired by professional technical documentation, designed to reduce eye strain and improve focus.

## 🛠 Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Testing**: Vitest + React Testing Library
- **Design**: Custom "Vector" Design System (Paper-like aesthetic)

## 📦 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation

```bash
bun install
```

### Development

Run the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

```bash
bun run build
```

### Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch
```

### Importing Pipeline B feature-seeds

After running the methodology Pipeline B, you can stage all generated seeds in one shot:

```bash
npx vector-wizard import ./docs/methodology/artifacts/seeds/
# or one or many specific files
npx vector-wizard import ./seed-a.feature-seed.json ./seed-b.feature-seed.json
```

The CLI writes the resolved drafts into `.vector/import/pending.json` and then launches the wizard. On first load, the wizard auto-imports each draft into its Draft Manager and shows a toast summarising the result. The pending file is consumed atomically (read-and-deleted), so refreshing the wizard never causes duplicate imports.

## 🏗 Architecture

The project follows a self-contained feature-based architecture located in `src/features/spec-wizard/`:

- **model/**: Canonical types (`FeatureDraft`, `ValidationIssue`) and validation rules.
- **services/**: Business logic for YAML serialization, Markdown summaries, and AI assistance.
- **components/**: UI components for the wizard, preview panels, and field management.
- **persistence/**: Local storage and JSON draft handling.
- **i18n/**: Dictionary-based internationalization.
- **api/**: Shared contracts for server-client communication.

## 🤖 AI Agent Skills

Vector ships with two core skills for AI agents to bridge the gap between ideas, code, and roadmap specs.

### 1. `vector-analyzer` (Code → Spec)
Reverse-engineers an existing codebase into a Vector-compatible `FeatureDraft` JSON.
- **Location**: `.agents/skills/vector-analyzer/SKILL.md`
- **Use case**: When you have code but no documentation or roadmap.

### 2. `vector-pipeline-b` (Idea → Spec)
Walks a system idea through a 4-stage pipeline: **Frame → Decompose → Slice → Handoff**.
- **Location**: `.agents/skills/vector-pipeline-b/SKILL.md`
- **Use case**: When starting a new project from scratch.

---

### Installation & Setup

Paste this into a fresh chat with your AI coding agent (Claude Code, Codex, Cursor, etc.). It will detect your platform and install the requested skills:

> Please install the `vector-analyzer` and `vector-pipeline-b` skills from this repo (located in `.agents/skills/`).
>
> 1. Detect which agent platform you are running in.
> 2. For Claude Code: copy the skill directories to `~/.claude/skills/`.
> 3. For other agents: tell me the recommended install path on this system and propose a `cp` / `ln -s` command before running it.
> 4. Confirm the destination, run the command, and verify the files land by reading `SKILL.md` back.
> 5. Print a one-line usage hint for each skill in your platform.

### Remote Install (from GitHub)

If you haven't cloned the repo yet, use this prompt:

> Please install the `vector-analyzer` and `vector-pipeline-b` skills from https://github.com/CarlLee1983/vector-wizard.
>
> 1. Shallow-clone the repo to `/tmp/vector-wizard-skills`.
> 2. Install the skills found in `.agents/skills/` to my agent's local skill directory.
> 3. Clean up the temp clone and verify the install.

### Usage Example

**For Path A (Reverse-engineering):**
> Use the `vector-analyzer` skill to analyze this repo and produce a `FeatureDraft` JSON. I will paste it into `npx vector-wizard`'s Draft Manager.

**For Path B (System Design):**
> Use the `vector-pipeline-b` skill to frame my system idea: "I want to build a [System X]". Follow the stages until we have feature-seed JSON files.

## 📄 License

This project is private and intended for internal use.
