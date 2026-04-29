import type { Locale } from "../model/specTypes"

type SeedPromptOptions = {
  title: string
  owner?: string
  locale: Locale
}

export function buildSeedPrompt({ title, owner, locale }: SeedPromptOptions): string {
  const languageName = locale === "zh-TW" ? "Traditional Chinese (Taiwan)" : "English"

  return `You are an expert Agile Product Manager and Business Analyst. I want you to help me generate an initial draft for a technical feature specification.

## Context
Feature Title: ${title}
Owner: ${owner || "Unassigned"}
Target Language: ${languageName}

## Task
Please generate a JSON object that follows the schema below. This JSON will be imported into a tool called "Vector" which helps bridge the gap between business stakeholders and AI coding agents.

## JSON Schema Requirements
The output MUST be a valid JSON object with the following structure:
- metadata: { title: string, owner: string, locale: "${locale}" }
- summary: { problem: string, desiredOutcome: string }
- goal: {
    statement: string,
    successSignals: Array<{
      statement: string,
      metric?: string,
      threshold?: string,
      kind?: "leading" | "lagging"
    }>
  }
- impacts: Array<{ id: string, actor: string, impact: string }>
- deliverables: Array<{ id: string, name: string, description: string }>
- userActivities: Array<{ id: string, actor: string, activity: string }>
- epics: Array<{ 
    id: string, 
    title: string, 
    stories: Array<{
      id: string,
      title: string,
      userStory: string,
      acceptanceCriteria: Array<{ id: string, statement: string }>,
      examples: Array<{ 
        id: string, 
        format: "given-when-then", 
        given: string, 
        when: string, 
        then: string 
      }>
    }>
  }>
- agentBoundaries: { 
    nonGoals: string[], 
    constraints: string[], 
    testExpectations: string[],
    risks: string[],
    openQuestions: string[]
  }

## Guidelines
1. Be specific and technical.
2. Ensure at least one User Story is included with acceptance criteria and Gherkin-style examples (Given/When/Then).
3. The content of the JSON (strings) should be in ${languageName}.
4. Output ONLY the raw JSON object, no conversational text.

Generate the draft now:`
}
