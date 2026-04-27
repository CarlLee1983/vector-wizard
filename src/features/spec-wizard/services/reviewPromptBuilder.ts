import { dictionaries } from "../i18n/dictionaries"
import type { Locale } from "../model/specTypes"

export type BuildReviewPromptInput = {
  yaml: string
  summary: string
  locale: Locale
}

export function buildReviewPrompt(input: BuildReviewPromptInput): string {
  const template = dictionaries[input.locale]["reviewPrompt.template"]
  return template.replace("{{summary_markdown}}", input.summary).replace("{{yaml_content}}", input.yaml)
}
