import { handleDraftRequest } from "@/features/spec-wizard/services/localAgent/draftRequestRouteHandler"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request): Promise<Response> {
  return handleDraftRequest(request)
}
