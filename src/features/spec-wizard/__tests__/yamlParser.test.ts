import { describe, expect, it } from "vitest"
import { YamlParseError, parseYamlDocument, parseScalar } from "../services/yamlParser"

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
