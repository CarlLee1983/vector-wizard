import type { Locale } from "../../model/specTypes"
import type { DraftGenerationResult, GenerateDraftInput } from "./draftGenerator"
import { generateDraft as defaultGenerateDraft } from "./draftGenerator"

const VALID_LOCALES: readonly Locale[] = ["zh-TW", "en"]

type GenerateDraftFn = (input: GenerateDraftInput) => Promise<DraftGenerationResult>

export type DraftRequestDeps = {
  generateDraft?: GenerateDraftFn
  cwd?: string
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  })
}

export async function handleDraftRequest(req: Request, deps: DraftRequestDeps = {}): Promise<Response> {
  const generate = deps.generateDraft ?? defaultGenerateDraft
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
  const { title, owner, locale } = body as { title?: unknown; owner?: unknown; locale?: unknown }
  if (typeof title !== "string" || title.trim().length === 0) {
    return badRequest("title required")
  }
  if (typeof locale !== "string" || !(VALID_LOCALES as readonly string[]).includes(locale)) {
    return badRequest("locale must be zh-TW or en")
  }
  const ownerValue = typeof owner === "string" && owner.trim().length > 0 ? owner : undefined

  const result = await generate({
    title,
    owner: ownerValue,
    locale: locale as Locale,
    cwd,
    signal: req.signal
  })

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
}
