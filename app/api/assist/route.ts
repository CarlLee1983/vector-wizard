import { NextResponse } from "next/server";
import { assistDraft, type AssistRequest, type AssistResponse } from "@/features/spec-wizard/services/assistService";
import type { ApiErrorResponse } from "@/features/spec-wizard/api/contracts";

function isAssistRequest(value: unknown): value is AssistRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as AssistRequest;
  return (candidate.mode === "rewrite" || candidate.mode === "quality_check") && (candidate.locale === "zh-TW" || candidate.locale === "en");
}

export async function POST(request: Request): Promise<NextResponse<AssistResponse | ApiErrorResponse>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request: body must be JSON." }, { status: 400 });
  }

  if (!isAssistRequest(body)) {
    return NextResponse.json({ error: "Invalid request: expected assist mode and locale." }, { status: 400 });
  }

  return NextResponse.json(await assistDraft(body));
}
