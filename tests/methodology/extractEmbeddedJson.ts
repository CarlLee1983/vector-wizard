export type EmbeddedJsonBlock = {
  schema: string
  json: unknown
}

const PATTERN = /<!--\s*schema:\s*([a-z-]+)\s*-->\s*\n```json\s*\n([\s\S]*?)\n```/g

export function extractEmbeddedJson(markdown: string): EmbeddedJsonBlock[] {
  // Reset state since PATTERN is module-scoped with the /g flag and lastIndex persists across calls.
  PATTERN.lastIndex = 0
  const blocks: EmbeddedJsonBlock[] = []
  let match: RegExpExecArray | null
  while ((match = PATTERN.exec(markdown)) !== null) {
    const [, schema, raw] = match
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to parse JSON for schema='${schema}': ${reason}`)
    }
    blocks.push({ schema, json: parsed })
  }
  return blocks
}
