import { handleWizardAction } from "@/features/spec-wizard/services/localAgent/wizardActionRouteHandler"

export const runtime = "nodejs"

export async function POST(request: Request): Promise<Response> {
  return handleWizardAction(request)
}
