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

export function parseYamlDocument(raw: string): unknown {
  const stripped = raw.replace(/\r\n?/g, "\n")
  const lines = stripped.split("\n")
  const meaningful = lines.filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"))
  if (meaningful.length === 0) {
    throw new YamlParseError("YAML document is empty", 0)
  }
  // TODO(#5 task 2-4): replace with real document parser.
  throw new YamlParseError("YAML parser not yet implemented", 0)
}
