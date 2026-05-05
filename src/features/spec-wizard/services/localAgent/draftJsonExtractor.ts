export type ExtractResult = { ok: true; value: unknown } | { ok: false }

const FENCE_RE = /```(?:json)?\s*\n([\s\S]*?)\n```/g

export function extractDraftJson(raw: string): ExtractResult {
  if (!raw || !raw.trim()) return { ok: false }

  for (const candidate of fencedCandidates(raw)) {
    const parsed = tryParseObject(candidate)
    if (parsed.ok) return parsed
  }

  const trimmed = raw.trim()
  const whole = tryParseObject(trimmed)
  if (whole.ok) return whole

  const sliced = sliceFirstObject(raw)
  if (sliced) {
    const parsed = tryParseObject(sliced)
    if (parsed.ok) return parsed
  }

  return { ok: false }
}

function fencedCandidates(raw: string): string[] {
  const out: string[] = []
  let match: RegExpExecArray | null
  FENCE_RE.lastIndex = 0
  while ((match = FENCE_RE.exec(raw)) !== null) {
    out.push(match[1].trim())
  }
  return out
}

function tryParseObject(text: string): ExtractResult {
  if (!text) return { ok: false }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return { ok: true, value: parsed }
  }
  return { ok: false }
}

function sliceFirstObject(raw: string): string | null {
  const start = raw.indexOf("{")
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === "\\") {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === "{") {
      depth += 1
    } else if (ch === "}") {
      depth -= 1
      if (depth === 0) {
        return raw.slice(start, i + 1)
      }
    }
  }
  return null
}
