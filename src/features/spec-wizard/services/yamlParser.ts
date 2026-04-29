export class YamlParseError extends Error {
  readonly line: number
  readonly cause?: string

  constructor(message: string, line: number, cause?: string) {
    super(message)
    this.name = "YamlParseError"
    this.line = line
    this.cause = cause
  }
}

export function parseYamlDocument(raw: string): unknown {
  const stripped = raw.replace(/\r\n?/g, "\n")
  const lines = stripped.split("\n")
  const meaningful = lines.filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"))
  if (meaningful.length === 0) {
    throw new YamlParseError("YAML document is empty", 0)
  }
  throw new Error("not implemented")
}
