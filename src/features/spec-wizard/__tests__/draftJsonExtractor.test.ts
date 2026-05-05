import { describe, expect, it } from "vitest"
import { extractDraftJson } from "../services/localAgent/draftJsonExtractor"

describe("extractDraftJson", () => {
  it("parses raw JSON object output", () => {
    const raw = '{"metadata":{"title":"x"},"goal":{"statement":"y"},"epics":[]}'
    const result = extractDraftJson(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.value as { metadata: { title: string } }).metadata.title).toBe("x")
    }
  })

  it("parses JSON wrapped in ```json fenced block", () => {
    const raw = ["Some preamble.", "```json", '{"metadata":{"title":"hello"}}', "```", "Trailing prose."].join("\n")
    const result = extractDraftJson(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.value as { metadata: { title: string } }).metadata.title).toBe("hello")
    }
  })

  it("parses JSON wrapped in unlabeled ``` fenced block", () => {
    const raw = ["```", '{"a": 1, "b": [2, 3]}', "```"].join("\n")
    const result = extractDraftJson(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.value as { a: number }).a).toBe(1)
    }
  })

  it("recovers JSON object surrounded by leading and trailing prose", () => {
    const raw = 'Here is your draft:\n{"metadata":{"title":"recovery"},"goal":{},"epics":[]}\nDone!'
    const result = extractDraftJson(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.value as { metadata: { title: string } }).metadata.title).toBe("recovery")
    }
  })

  it("returns ok=false when no JSON object is present", () => {
    expect(extractDraftJson("just a friendly message").ok).toBe(false)
  })

  it("returns ok=false for empty input", () => {
    expect(extractDraftJson("").ok).toBe(false)
    expect(extractDraftJson("   \n\n  ").ok).toBe(false)
  })

  it("returns ok=false when the only braces form invalid JSON", () => {
    expect(extractDraftJson("{ not json }").ok).toBe(false)
  })

  it("rejects bare arrays (only objects accepted)", () => {
    expect(extractDraftJson("[1,2,3]").ok).toBe(false)
  })

  it("ignores braces inside strings when computing object boundaries", () => {
    const raw = '{"text":"value with }} braces { inside","n":1}'
    const result = extractDraftJson(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.value as { text: string }).text).toBe("value with }} braces { inside")
    }
  })

  it("prefers fenced block over surrounding prose JSON", () => {
    const raw = [
      '{"metadata":{"title":"prose-json"}}',
      "",
      "```json",
      '{"metadata":{"title":"fence-json"}}',
      "```"
    ].join("\n")
    const result = extractDraftJson(raw)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.value as { metadata: { title: string } }).metadata.title).toBe("fence-json")
    }
  })
})
