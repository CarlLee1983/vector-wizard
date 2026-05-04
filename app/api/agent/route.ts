import { handleAgentRequest } from "@/features/spec-wizard/services/localAgent/agentRouteHandler"
import { createClaudeProvider } from "@/features/spec-wizard/services/localAgent/claudeProvider"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  return handleAgentRequest(request, createClaudeProvider(), process.cwd())
}
