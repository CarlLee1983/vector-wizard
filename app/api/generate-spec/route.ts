import { NextResponse } from "next/server"
import type { ApiErrorResponse, GenerateSpecRequest, GenerateSpecResponse } from "@/features/spec-wizard/api/contracts"
import { validateDraft } from "@/features/spec-wizard/model/validation"
import { buildHumanSummary } from "@/features/spec-wizard/services/summary"
import { draftToYaml } from "@/features/spec-wizard/services/yamlSerializer"

function isGenerateSpecRequest(value: unknown): value is GenerateSpecRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "draft" in value &&
    typeof (value as GenerateSpecRequest).draft === "object"
  )
}

export async function POST(request: Request): Promise<NextResponse<GenerateSpecResponse | ApiErrorResponse>> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request: body must be JSON." }, { status: 400 })
  }

  if (!isGenerateSpecRequest(body)) {
    return NextResponse.json({ error: "Invalid request: expected a draft object." }, { status: 400 })
  }

  const createdAt = body.createdAt ?? new Date().toISOString().slice(0, 10)
  const validation = validateDraft(body.draft)

  return NextResponse.json({
    yaml: draftToYaml(body.draft, createdAt),
    summary: buildHumanSummary(body.draft),
    validation
  })
}
