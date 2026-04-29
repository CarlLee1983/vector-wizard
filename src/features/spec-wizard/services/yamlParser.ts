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
