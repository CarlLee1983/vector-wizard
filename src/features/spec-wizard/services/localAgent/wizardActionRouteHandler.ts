import type { FeatureDraft } from "../../model/specTypes"
import type { ActionResult } from "./actionResult"
import { runAction as defaultRunAction } from "./actionRunner"

type RunActionFn = (input: {
  actionId: string
  draft: FeatureDraft
  cwd: string
  signal?: AbortSignal
}) => Promise<ActionResult>

export type WizardActionDeps = {
  runAction?: RunActionFn
  cwd?: string
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  })
}

export async function handleWizardAction(req: Request, deps: WizardActionDeps = {}): Promise<Response> {
  const runAction = deps.runAction ?? defaultRunAction
  const cwd = deps.cwd ?? process.cwd()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest("invalid JSON body")
  }
  if (!body || typeof body !== "object") {
    return badRequest("body must be an object")
  }
  const { actionId, draft } = body as { actionId?: unknown; draft?: unknown }
  if (typeof actionId !== "string" || actionId.length === 0) {
    return badRequest("actionId required")
  }
  if (!draft || typeof draft !== "object") {
    return badRequest("draft required")
  }
  const result = await runAction({
    actionId,
    draft: draft as FeatureDraft,
    cwd,
    signal: req.signal
  })
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
}
