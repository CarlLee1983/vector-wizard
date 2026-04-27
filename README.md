# Vector Agile Roadmap Wizard

Vector is a high-density, professional technical design tool that bridges the gap between non-technical decision-makers and AI coding agents. It walks users through an agile roadmap interview and exports an AI-ready YAML feature specification.

## 🚀 Key Features

- **Interactive Spec Wizard**: A guided interview process to capture requirements, user stories, and acceptance criteria.
- **AI-Ready Export**: Generates structured YAML specifications optimized for consumption by AI agents (e.g., Claude Code, Cursor, Copilot).
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

## 🏗 Architecture

The project follows a self-contained feature-based architecture located in `src/features/spec-wizard/`:

- **model/**: Canonical types (`FeatureDraft`, `ValidationIssue`) and validation rules.
- **services/**: Business logic for YAML serialization, Markdown summaries, and AI assistance.
- **components/**: UI components for the wizard, preview panels, and field management.
- **persistence/**: Local storage and JSON draft handling.
- **i18n/**: Dictionary-based internationalization.
- **api/**: Shared contracts for server-client communication.

## 🤖 AI Agent Skill: `vector-analyzer`

This repo ships a reusable skill at `.agents/skills/vector-analyzer/SKILL.md` that teaches AI agents how to reverse-engineer an existing codebase into a Vector-compatible `FeatureDraft` JSON. The output pastes straight into the wizard's Draft Manager.

### Manual install (Claude Code)

Globally for all projects:

```bash
mkdir -p ~/.claude/skills
cp -R .agents/skills/vector-analyzer ~/.claude/skills/
```

Project-scoped (only inside one target repo) — copy or symlink:

```bash
mkdir -p /path/to/target-repo/.claude/skills
ln -s "$(pwd)/.agents/skills/vector-analyzer" \
      /path/to/target-repo/.claude/skills/vector-analyzer
```

Other agents (Codex, Cursor, Copilot, …) can read `.agents/skills/vector-analyzer/SKILL.md` directly — point the agent at the file when invoking it.

### Install via agent prompt

Paste this into a fresh chat with your AI coding agent. It detects your platform and installs the skill:

> Please install the `vector-analyzer` skill from this repo, located at `.agents/skills/vector-analyzer/SKILL.md`, so I can reuse it across projects.
>
> 1. Detect which agent platform you are running in (Claude Code, Codex, Cursor, Copilot, …).
> 2. For Claude Code: copy the directory to `~/.claude/skills/vector-analyzer/`.
> 3. For other agents: tell me the recommended install path on this system and propose a `cp` / `ln -s` command before running it.
> 4. Confirm the destination, run the command, and verify the file lands by reading `SKILL.md` back.
> 5. Print a one-line usage hint: how I should invoke the skill in your platform.

### Install from GitHub via agent prompt

Don't have the repo cloned? Paste this into your AI agent — it fetches just the skill from GitHub:

> Please install the `vector-analyzer` skill from https://github.com/CarlLee1983/vector-wizard so I can reuse it across projects.
>
> 1. Detect which agent platform you are running in (Claude Code, Codex, Cursor, Copilot, …).
> 2. Shallow-clone the repo to a temp directory: `git clone --depth 1 https://github.com/CarlLee1983/vector-wizard /tmp/vector-wizard-skill`.
> 3. For Claude Code: copy `/tmp/vector-wizard-skill/.agents/skills/vector-analyzer` to `~/.claude/skills/vector-analyzer/`.
> 4. For other agents: tell me the recommended install path on this system and propose a `cp` / `ln -s` command before running it.
> 5. Clean up the temp clone.
> 6. Verify by reading `SKILL.md` from the install destination, then print a one-line usage hint.

### Usage

After install, ask your agent:

> Use the `vector-analyzer` skill to analyze this repo and produce a `FeatureDraft` JSON. I will paste it into `npx vector-wizard`'s Draft Manager.

## 📄 License

This project is private and intended for internal use.
