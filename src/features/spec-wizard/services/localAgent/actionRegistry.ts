import type { FeatureDraft } from "../../model/specTypes"

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
