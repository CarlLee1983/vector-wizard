import type { FeatureDraft, ValidationResult } from "../model/specTypes"

export type GenerateSpecRequest = {
  draft: FeatureDraft
  createdAt?: string
}

export type GenerateSpecResponse = {
  yaml: string
  summary: string
  validation: ValidationResult
}

export type ApiErrorResponse = {
  error: string
}
