import { describe, expect, it } from "vitest"
import { YamlParseError, parseYamlDocument, parseScalar, tokenizeYaml } from "../services/yamlParser"

describe("parseYamlDocument", () => {
  it("throws YamlParseError on empty input", () => {
    expect(() => parseYamlDocument("")).toThrow(YamlParseError)
    expect(() => parseYamlDocument("   \n  \n")).toThrow(YamlParseError)
  })
})

describe("parseScalar", () => {
  it("parses JSON-quoted strings", () => {
    expect(parseScalar('"hello"', 1)).toBe("hello")
    expect(parseScalar('"with \\"quote\\""', 1)).toBe('with "quote"')
    expect(parseScalar('""', 1)).toBe("")
  })

  it("parses literal null/true/false/number", () => {
    expect(parseScalar("null", 1)).toBeNull()
    expect(parseScalar("true", 1)).toBe(true)
    expect(parseScalar("false", 1)).toBe(false)
    expect(parseScalar("42", 1)).toBe(42)
  })

  it("parses empty inline array", () => {
    expect(parseScalar("[]", 1)).toEqual([])
  })

  it("throws YamlParseError with line on bad scalar", () => {
    expect(() => parseScalar("undefined", 7)).toThrow(YamlParseError)
    try {
      parseScalar("undefined", 7)
    } catch (err) {
      expect(err).toBeInstanceOf(YamlParseError)
      expect((err as YamlParseError).line).toBe(7)
    }
  })
})

describe("tokenizeYaml", () => {
  it("classifies key-value with inline scalar", () => {
    expect(tokenizeYaml('schemaVersion: "0.2"')).toEqual([
      { line: 1, indent: 0, kind: "kv-inline", key: "schemaVersion", value: '"0.2"' }
    ])
  })

  it("classifies key with nested children (no inline value)", () => {
    expect(tokenizeYaml("metadata:")).toEqual([{ line: 1, indent: 0, kind: "kv-block", key: "metadata" }])
  })

  it("classifies list item with inline scalar", () => {
    expect(tokenizeYaml('  - "FT-002"')).toEqual([{ line: 1, indent: 2, kind: "list-scalar", value: '"FT-002"' }])
  })

  it("classifies list item that opens an inline kv", () => {
    expect(tokenizeYaml('  - id: "R-001"')).toEqual([
      { line: 1, indent: 2, kind: "list-kv-inline", key: "id", value: '"R-001"' }
    ])
  })

  it("classifies list item that opens a block kv", () => {
    expect(tokenizeYaml("  - title:")).toEqual([{ line: 1, indent: 2, kind: "list-kv-block", key: "title" }])
  })

  it("strips full-line comments and blank lines", () => {
    const input = ["# top comment", "", "metadata:", '  title: "x"'].join("\n")
    expect(tokenizeYaml(input)).toEqual([
      { line: 3, indent: 0, kind: "kv-block", key: "metadata" },
      { line: 4, indent: 2, kind: "kv-inline", key: "title", value: '"x"' }
    ])
  })

  it("preserves line numbers across blanks", () => {
    const input = ["a: 1", "", "b: 2"].join("\n")
    expect(tokenizeYaml(input).map((t) => t.line)).toEqual([1, 3])
  })
})
