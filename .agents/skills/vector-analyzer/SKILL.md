---
name: vector-analyzer
description: Analyze source code and generate Vector-compatible JSON feature specifications.
---

# Vector Analyzer Skill

This skill enables AI agents to analyze existing codebases and automatically generate feature specification JSONs that align with the "Vector" architecture. It helps transform current implementation logic into structured agile development roadmaps.

## Commands

### `vector:analyze`
Analyze the code in the current directory and generate a feature specification JSON.

**Workflow:**
1. AI scans the target directory to identify core modules.
2. AI maps modules to "Epics" and "User Stories".
3. AI generates a JSON draft matching the Vector Schema.
4. The user pastes the JSON into the Vector Wizard interface for review and export.

## Workflow

1. **Discovery Phase**:
   - Use `ls` or `gsd-map-codebase` to understand the file structure.
   - Read core files (e.g., Services, Controllers, API definitions).

2. **Analysis Phase**:
   - For each functional module, identify the following information:
     - **Goal**: What problem does this code solve?
     - **Impact**: Who are the users? How do they benefit?
     - **User Stories**: Convert implementation logic into "As a [role], I want to [action], so that [benefit]".
     - **Acceptance Criteria**: Extract rules from the code logic.
     - **Examples**: Convert test cases or logic flows into Given/When/Then scenarios.

3. **Generation Phase**:
   - Output a JSON object matching the `FeatureDraft` Schema.
   - Locale: Default to Traditional Chinese (Taiwan) unless otherwise specified.

## Schema Reference

The generated JSON must include:
- `metadata`: Title, owner, locale.
- `summary`: Problem description, desired outcome.
- `goal`: Goal statement, success signals.
- `impacts`: Affected actors and the nature of the impact.
- `deliverables`: List of deliverables.
- `userActivities`: User activity flows.
- `epics`: Feature sets containing multiple User Stories (AC & Examples).
- `agentBoundaries`: Non-goals, constraints, risks, and open questions.
