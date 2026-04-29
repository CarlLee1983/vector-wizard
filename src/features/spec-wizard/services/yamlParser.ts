import type { FeatureDraft } from "../model/specTypes"
import { normalizeDraft } from "../persistence/draftStorage"

export class YamlParseError extends Error {
  readonly line: number
  readonly snippet?: string

  constructor(message: string, line: number, snippet?: string) {
    super(message)
    this.name = "YamlParseError"
    this.line = line
    this.snippet = snippet
  }
}

export function parseScalar(token: string, lineNumber: number): unknown {
  const trimmed = token.trim()
  if (trimmed === "[]") return []
  try {
    return JSON.parse(trimmed)
  } catch (err) {
    throw new YamlParseError(`Cannot parse scalar: ${trimmed}`, lineNumber, (err as Error).message)
  }
}

export type YamlToken =
  | { line: number; indent: number; kind: "kv-inline"; key: string; value: string }
  | { line: number; indent: number; kind: "kv-block"; key: string }
  | { line: number; indent: number; kind: "list-scalar"; value: string }
  | { line: number; indent: number; kind: "list-kv-inline"; key: string; value: string }
  | { line: number; indent: number; kind: "list-kv-block"; key: string }

const KEY_RE = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/

export function tokenizeYaml(raw: string): YamlToken[] {
  const stripped = raw.replace(/\r\n?/g, "\n")
  const tokens: YamlToken[] = []
  const lines = stripped.split("\n")

  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1
    const original = lines[i]
    const trimmed = original.trim()
    if (trimmed.length === 0) continue
    if (trimmed.startsWith("#")) continue

    const leading = original.match(/^[ \t]*/)?.[0] ?? ""
    if (leading.includes("\t")) {
      throw new YamlParseError("Tab characters not allowed in indentation", lineNumber)
    }
    const indent = leading.length

    if (trimmed === "-" || trimmed.startsWith("- ")) {
      const remainder = trimmed === "-" ? "" : trimmed.slice(2).trim()
      if (remainder.length === 0) {
        throw new YamlParseError("List item has no value", lineNumber)
      }
      const kvMatch = KEY_RE.exec(remainder)
      if (kvMatch) {
        const [, key, value] = kvMatch
        if (value.length === 0) {
          tokens.push({ line: lineNumber, indent, kind: "list-kv-block", key })
        } else {
          tokens.push({ line: lineNumber, indent, kind: "list-kv-inline", key, value })
        }
      } else {
        tokens.push({ line: lineNumber, indent, kind: "list-scalar", value: remainder })
      }
      continue
    }

    const kvMatch = KEY_RE.exec(trimmed)
    if (!kvMatch) {
      throw new YamlParseError(`Unrecognized line: ${trimmed}`, lineNumber)
    }
    const [, key, value] = kvMatch
    if (value.length === 0) {
      tokens.push({ line: lineNumber, indent, kind: "kv-block", key })
    } else {
      tokens.push({ line: lineNumber, indent, kind: "kv-inline", key, value })
    }
  }

  return tokens
}

type ObjectFrame = {
  kind: "object"
  indent: number
  container: Record<string, unknown>
  pendingKey?: string
}
type ArrayFrame = { kind: "array"; indent: number; container: unknown[] }
type Frame = ObjectFrame | ArrayFrame

export function parseYamlDocument(raw: string): unknown {
  const tokens = tokenizeYaml(raw)
  if (tokens.length === 0) {
    throw new YamlParseError("YAML document is empty", 0)
  }

  const root: Record<string, unknown> = {}
  const stack: Frame[] = [{ kind: "object", indent: -1, container: root }]

  for (const token of tokens) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= token.indent) {
      stack.pop()
    }

    let top = stack[stack.length - 1]

    if (token.kind === "kv-inline" || token.kind === "kv-block") {
      if (top.kind !== "object") {
        throw new YamlParseError(`Expected list item, got "${token.key}:"`, token.line)
      }
      top.pendingKey = undefined
      if (token.kind === "kv-inline") {
        top.container[token.key] = parseScalar(token.value, token.line)
      } else {
        const placeholder: Record<string, unknown> = {}
        top.container[token.key] = placeholder
        stack.push({ kind: "object", indent: token.indent, container: placeholder, pendingKey: token.key })
      }
      continue
    }

    // list-* tokens — convert pending placeholder object to an array if needed
    if (top.kind === "object") {
      if (!top.pendingKey) {
        throw new YamlParseError("List item has no parent key", token.line)
      }
      const parent = stack[stack.length - 2]
      if (!parent || parent.kind !== "object") {
        throw new YamlParseError("List item's grandparent is not an object", token.line)
      }
      const arr: unknown[] = []
      parent.container[top.pendingKey] = arr
      const parentIndent = top.indent
      stack.pop()
      stack.push({ kind: "array", indent: parentIndent, container: arr })
      top = stack[stack.length - 1]
    }

    if (top.kind !== "array") {
      throw new YamlParseError("Expected to be inside an array frame", token.line)
    }

    if (token.kind === "list-scalar") {
      top.container.push(parseScalar(token.value, token.line))
      continue
    }

    // list-kv-inline / list-kv-block — each "- " starts a new object element
    const obj: Record<string, unknown> = {}
    top.container.push(obj)
    const objFrame: ObjectFrame = { kind: "object", indent: token.indent, container: obj }
    stack.push(objFrame)
    if (token.kind === "list-kv-inline") {
      obj[token.key] = parseScalar(token.value, token.line)
    } else {
      const placeholder: Record<string, unknown> = {}
      obj[token.key] = placeholder
      objFrame.pendingKey = token.key
      stack.push({ kind: "object", indent: token.indent, container: placeholder, pendingKey: token.key })
    }
  }

  return root
}

const SUPPORTED_SCHEMA_VERSIONS = ["0.1", "0.2"] as const

function asObject(value: unknown, line: number, label: string): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  throw new YamlParseError(`Expected ${label} to be an object`, line)
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  return []
}

function synthesizeIds(items: unknown[], prefix: string): Record<string, unknown>[] {
  return items.map((item, index) => {
    const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
    const fallback = `${prefix}-${String(index + 1).padStart(3, "0")}`
    const id = typeof obj.id === "string" && obj.id.trim().length > 0 ? obj.id : fallback
    return { ...obj, id }
  })
}

export function yamlToDraft(raw: string): { schemaVersion: string; draft: FeatureDraft } {
  const root = asObject(parseYamlDocument(raw), 1, "document root")

  const schemaVersionRaw = root.schemaVersion
  if (typeof schemaVersionRaw !== "string") {
    throw new YamlParseError("Missing schemaVersion", 1)
  }
  if (!(SUPPORTED_SCHEMA_VERSIONS as readonly string[]).includes(schemaVersionRaw)) {
    throw new YamlParseError(`Unsupported schemaVersion: ${schemaVersionRaw}`, 1)
  }

  const metadata = asObject(root.metadata, 1, "metadata")
  const productSpec = asObject(root.productSpec, 1, "productSpec")
  const agentSpec = asObject(root.agentSpec, 1, "agentSpec")
  const summary =
    root.summary && typeof root.summary === "object" && !Array.isArray(root.summary)
      ? (root.summary as Record<string, unknown>)
      : {}

  const goal = asObject(productSpec.goal, 1, "productSpec.goal")

  const {
    createdAt: _createdAt,
    status: _status,
    ...metaRest
  } = metadata as Record<string, unknown> & { createdAt?: unknown; status?: unknown }

  const candidate: unknown = {
    metadata: metaRest,
    summary,
    goal: {
      statement: typeof goal.statement === "string" ? goal.statement : "",
      successSignals: asArray(goal.successSignals)
    },
    impacts: synthesizeIds(asArray(productSpec.impacts), "IM"),
    deliverables: synthesizeIds(asArray(productSpec.deliverables), "DE"),
    userActivities: synthesizeIds(asArray(productSpec.userActivities), "UA"),
    epics: synthesizeIds(asArray(productSpec.epics), "EP"),
    agentBoundaries: {
      nonGoals: asArray(agentSpec.nonGoals),
      constraints: asArray(agentSpec.constraints),
      testExpectations: asArray(agentSpec.testExpectations),
      risks: asArray(agentSpec.qualityWarnings),
      openQuestions: asArray(agentSpec.openQuestions)
    }
  }

  const draft = normalizeDraft(candidate)
  return { schemaVersion: schemaVersionRaw, draft }
}
