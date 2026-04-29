import { describe, expect, it } from "vitest"
import { YamlParseError, parseYamlDocument, parseScalar, tokenizeYaml, yamlToDraft } from "../services/yamlParser"
import { draftToYaml } from "../services/yamlSerializer"
import { minimalValidDraft } from "../test/fixtures"

describe("parseYamlDocument", () => {
  it("throws YamlParseError on empty input", () => {
    expect(() => parseYamlDocument("")).toThrow(YamlParseError)
    expect(() => parseYamlDocument("   \n  \n")).toThrow(YamlParseError)
  })

  it("parses a flat key-value document", () => {
    const yaml = ['a: "x"', 'b: "y"'].join("\n")
    expect(parseYamlDocument(yaml)).toEqual({ a: "x", b: "y" })
  })

  it("parses nested objects", () => {
    const yaml = ["metadata:", '  title: "Login"', '  locale: "en"'].join("\n")
    expect(parseYamlDocument(yaml)).toEqual({ metadata: { title: "Login", locale: "en" } })
  })

  it("parses array of scalars", () => {
    const yaml = ["dependsOn:", '  - "FT-002"', '  - "FT-005"'].join("\n")
    expect(parseYamlDocument(yaml)).toEqual({ dependsOn: ["FT-002", "FT-005"] })
  })

  it("parses array of objects with mixed inline + block kvs", () => {
    const yaml = [
      "qualityWarnings:",
      '  - id: "R-001"',
      '    text: "Edge"',
      '    status: "open"',
      '  - id: "R-002"',
      '    text: "Cold start"',
      '    status: "validating"',
      '    mitigation: "Warm pool"'
    ].join("\n")
    expect(parseYamlDocument(yaml)).toEqual({
      qualityWarnings: [
        { id: "R-001", text: "Edge", status: "open" },
        { id: "R-002", text: "Cold start", status: "validating", mitigation: "Warm pool" }
      ]
    })
  })

  it("parses inline empty array", () => {
    const yaml = ["nonGoals: []", "constraints: []"].join("\n")
    expect(parseYamlDocument(yaml)).toEqual({ nonGoals: [], constraints: [] })
  })

  it("parses deeply nested structure (epic > stories > acceptanceCriteria)", () => {
    const yaml = [
      "epics:",
      '  - title: "Login"',
      "    stories:",
      '      - id: "US-001"',
      '        title: "Show msg"',
      "        acceptanceCriteria:",
      '          - id: "AC-001"',
      '            statement: "GWT"'
    ].join("\n")
    expect(parseYamlDocument(yaml)).toEqual({
      epics: [
        {
          title: "Login",
          stories: [{ id: "US-001", title: "Show msg", acceptanceCriteria: [{ id: "AC-001", statement: "GWT" }] }]
        }
      ]
    })
  })

  it("throws YamlParseError when a list item appears outside any list-bearing key", () => {
    const yaml = '- "orphan"'
    expect(() => parseYamlDocument(yaml)).toThrow(YamlParseError)
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

  it("throws on tab indentation", () => {
    expect(() => tokenizeYaml("\tkey: 1")).toThrow(YamlParseError)
    expect(() => tokenizeYaml(" \t key: 1")).toThrow(YamlParseError)
  })

  it("throws on empty list item", () => {
    expect(() => tokenizeYaml("- ")).toThrow(YamlParseError)
    expect(() => tokenizeYaml("-")).toThrow(YamlParseError)
  })

  it("throws on unrecognized line", () => {
    expect(() => tokenizeYaml("not a key or list")).toThrow(YamlParseError)
  })
})

describe("yamlToDraft", () => {
  it("requires top-level metadata, productSpec, agentSpec keys", () => {
    expect(() =>
      yamlToDraft('schemaVersion: "0.2"')
    ).toThrow(YamlParseError)
  })

  it("rejects unknown schemaVersion", () => {
    const yaml = ['schemaVersion: "9.9"', "metadata:", '  title: "x"', '  locale: "en"'].join("\n")
    expect(() => yamlToDraft(yaml)).toThrow(YamlParseError)
  })

  it("synthesizes ids for impacts/deliverables/userActivities/epics", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { draft } = yamlToDraft(yaml)
    expect(draft.impacts[0].id).toBe("IM-001")
    expect(draft.deliverables[0].id).toBe("DE-001")
    expect(draft.userActivities[0].id).toBe("UA-001")
    expect(draft.epics[0].id).toBe("EP-001")
  })

  it("preserves story / AC / example / RAID ids verbatim", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { draft } = yamlToDraft(yaml)
    expect(draft.epics[0].stories[0].id).toBe("US-001")
  })

  it("returns the schemaVersion alongside the draft", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { schemaVersion } = yamlToDraft(yaml)
    expect(schemaVersion).toBe("0.2")
  })

  it("drops export-only metadata.createdAt / metadata.status", () => {
    const yaml = draftToYaml(minimalValidDraft(), "2026-04-29")
    const { draft } = yamlToDraft(yaml)
    expect((draft.metadata as Record<string, unknown>).createdAt).toBeUndefined()
    expect((draft.metadata as Record<string, unknown>).status).toBeUndefined()
  })

  it("maps qualityWarnings/openQuestions back to agentBoundaries.risks/openQuestions", () => {
    const yaml = [
      'schemaVersion: "0.2"',
      "metadata:",
      '  title: "x"',
      '  locale: "en"',
      "summary:",
      '  problem: ""',
      '  desiredOutcome: ""',
      "productSpec:",
      "  goal:",
      '    statement: "g"',
      "    successSignals: []",
      "  impacts: []",
      "  deliverables: []",
      "  userActivities: []",
      "  epics: []",
      "agentSpec:",
      "  nonGoals: []",
      "  constraints: []",
      "  testExpectations: []",
      "  qualityWarnings:",
      '    - id: "R-001"',
      '      text: "edge"',
      '      status: "open"',
      "  openQuestions:",
      '    - id: "Q-001"',
      '      text: "?"',
      '      status: "open"'
    ].join("\n")
    const { draft } = yamlToDraft(yaml)
    expect(draft.agentBoundaries.risks).toEqual([{ id: "R-001", text: "edge", status: "open" }])
    expect(draft.agentBoundaries.openQuestions).toEqual([{ id: "Q-001", text: "?", status: "open" }])
  })
})
