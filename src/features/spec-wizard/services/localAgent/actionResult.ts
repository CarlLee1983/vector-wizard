export type ActionResultPreview = {
  kind: "preview"
  actionId: string
  preview: {
    text: string
    targetPath: string
    mode: "insert" | "replace"
  }
}

export type ActionResultNotes = {
  kind: "notes"
  actionId: string
  notes: Array<{
    severity: "info" | "warning"
    text: string
    ref?: string
  }>
}

export type ActionResultParseError = {
  kind: "parse_error"
  actionId: string
  raw: string
}

export type ActionResultRunError = {
  kind: "run_error"
  actionId: string
  message: string
}

export type ActionResult =
  | ActionResultPreview
  | ActionResultNotes
  | ActionResultParseError
  | ActionResultRunError

const FENCE_RE = /```vector-action\s*\n([\s\S]*?)\n```/

export function parseActionResult(raw: string, actionId: string): ActionResult {
  const match = FENCE_RE.exec(raw)
  if (!match) {
    return { kind: "parse_error", actionId, raw }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(match[1])
  } catch {
    return { kind: "parse_error", actionId, raw }
  }
  if (!parsed || typeof parsed !== "object") {
    return { kind: "parse_error", actionId, raw }
  }
  const preview = (parsed as { preview?: unknown }).preview
  if (preview !== undefined) {
    if (!isPreviewShape(preview)) return { kind: "parse_error", actionId, raw }
    return { kind: "preview", actionId, preview }
  }
  const notes = (parsed as { notes?: unknown }).notes
  if (notes !== undefined) {
    if (!isNotesShape(notes)) return { kind: "parse_error", actionId, raw }
    return { kind: "notes", actionId, notes }
  }
  return { kind: "parse_error", actionId, raw }
}

function isPreviewShape(v: unknown): v is ActionResultPreview["preview"] {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.text === "string" &&
    o.text.length > 0 &&
    typeof o.targetPath === "string" &&
    o.targetPath.length > 0 &&
    (o.mode === "insert" || o.mode === "replace")
  )
}

function isNotesShape(v: unknown): v is ActionResultNotes["notes"] {
  if (!Array.isArray(v) || v.length === 0) return false
  return v.every((item) => {
    if (!item || typeof item !== "object") return false
    const o = item as Record<string, unknown>
    return (
      (o.severity === "info" || o.severity === "warning") &&
      typeof o.text === "string" &&
      o.text.length > 0 &&
      (o.ref === undefined || typeof o.ref === "string")
    )
  })
}
