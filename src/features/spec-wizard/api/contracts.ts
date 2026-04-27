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

export type HandoffRequest = {
  yaml: string
  title: string
}

export type HandoffResponse = {
  success: true
  filePath: string
}

export type ApiErrorResponse = {
  error: string
}
