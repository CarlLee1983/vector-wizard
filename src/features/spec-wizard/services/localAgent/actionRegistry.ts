import type { FeatureDraft } from "../../model/specTypes"
import { storiesRewriteTemplate } from "./promptTemplates/storiesRewrite"
import { storiesGapsTemplate } from "./promptTemplates/storiesGaps"
import { storiesConsistencyTemplate } from "./promptTemplates/storiesConsistency"

export type ActionStepId =
  | "basic"
  | "context"
  | "goal"
  | "stories"
  | "criteria"
  | "examples"
  | "boundaries"
  | "deliverables"

export type ActionMutationKind = "preview" | "notes"

export type ActionDefinition = {
  id: string
  step: ActionStepId
  labelKey: string
  helpKey: string
  mutationKind: ActionMutationKind
  promptTemplate: (input: { draft: FeatureDraft }) => string
  disallowedTools: string[]
}

const REGISTRY: ActionDefinition[] = []

export function registerAction(def: ActionDefinition): void {
  if (REGISTRY.some((a) => a.id === def.id)) {
    throw new Error(`Action already registered: ${def.id}`)
  }
  REGISTRY.push(def)
}

export function getActionsForStep(step: ActionStepId): ActionDefinition[] {
  return REGISTRY.filter((a) => a.step === step)
}

export function getActionById(id: string): ActionDefinition | undefined {
  return REGISTRY.find((a) => a.id === id)
}

const FULL_TOOL_LOCK = [
  "Bash",
  "Read",
  "Edit",
  "Write",
  "MultiEdit",
  "WebFetch",
  "WebSearch",
  "NotebookEdit",
  "TodoWrite",
  "Glob",
  "Grep"
]

registerAction({
  id: "stories.rewrite",
  step: "stories",
  labelKey: "actionPanel.actions.stories.rewrite.label",
  helpKey: "actionPanel.actions.stories.rewrite.help",
  mutationKind: "preview",
  promptTemplate: storiesRewriteTemplate,
  disallowedTools: FULL_TOOL_LOCK
})

registerAction({
  id: "stories.gaps",
  step: "stories",
  labelKey: "actionPanel.actions.stories.gaps.label",
  helpKey: "actionPanel.actions.stories.gaps.help",
  mutationKind: "notes",
  promptTemplate: storiesGapsTemplate,
  disallowedTools: FULL_TOOL_LOCK
})

registerAction({
  id: "stories.consistency",
  step: "stories",
  labelKey: "actionPanel.actions.stories.consistency.label",
  helpKey: "actionPanel.actions.stories.consistency.help",
  mutationKind: "notes",
  promptTemplate: storiesConsistencyTemplate,
  disallowedTools: FULL_TOOL_LOCK
})
