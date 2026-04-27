import type { FeatureDraft } from "../model/specTypes"

function cleanString(value: string | undefined): string {
  return value?.trim() ?? ""
}

function cleanList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean)
}

function quote(value: string): string {
  return JSON.stringify(value)
}

function renderYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent)

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const rendered = renderYaml(item, indent + 2)
          return `${pad}- ${rendered.trimStart()}`
        }
        return `${pad}- ${renderYaml(item, 0)}`
      })
      .join("\n")
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => {
        if (Array.isArray(child)) {
          if (child.length === 0) return `${pad}${key}: []`
          return `${pad}${key}:\n${renderYaml(child, indent + 2)}`
        }
        if (typeof child === "object" && child !== null) {
          return `${pad}${key}:\n${renderYaml(child, indent + 2)}`
        }
        return `${pad}${key}: ${renderYaml(child, 0)}`
      })
      .join("\n")
  }

  if (typeof value === "string") return quote(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return "null"
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
        .map((deliverable) => ({
          name: cleanString(deliverable.name),
          description: cleanString(deliverable.description)
        })),
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
                .filter(
                  (example) =>
                    cleanString(example.given) ||
                    cleanString(example.when) ||
                    cleanString(example.then) ||
                    cleanString(example.scenario)
                )
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
  }
}

export function draftToYaml(draft: FeatureDraft, createdAt = new Date().toISOString().slice(0, 10)): string {
  return `${renderYaml(normalizeDraftForExport(draft, createdAt))}\n`
}
