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

## 📄 License

This project is private and intended for internal use.
