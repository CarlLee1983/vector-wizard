import { describe, expect, it } from "vitest"
import { extractEmbeddedJson } from "./extractEmbeddedJson"

describe("extractEmbeddedJson", () => {
  it("returns empty array when no markers exist", () => {
    const input = "# Hello\n\n```json\n{}\n```\n"
    expect(extractEmbeddedJson(input)).toEqual([])
  })

  it("extracts a single tagged block", () => {
    const input = [
      "# Stage",
      "",
      "<!-- schema: capability-list -->",
      "```json",
      "{ \"a\": 1 }",
      "```",
      ""
    ].join("\n")
    expect(extractEmbeddedJson(input)).toEqual([
      { schema: "capability-list", json: { a: 1 } }
    ])
  })

  it("extracts multiple tagged blocks of mixed schemas", () => {
    const input = [
      "<!-- schema: system-brief -->",
      "```json",
      "{ \"x\": 1 }",
      "```",
      "between text",
      "<!-- schema: feature-candidates -->",
      "```json",
      "{ \"y\": 2 }",
      "```"
    ].join("\n")
    expect(extractEmbeddedJson(input)).toEqual([
      { schema: "system-brief", json: { x: 1 } },
      { schema: "feature-candidates", json: { y: 2 } }
    ])
  })

  it("throws when a tagged block contains malformed JSON", () => {
    const input = [
      "<!-- schema: system-brief -->",
      "```json",
      "{ not valid",
      "```"
    ].join("\n")
    expect(() => extractEmbeddedJson(input)).toThrow(/JSON/)
  })

  it("ignores untagged json blocks", () => {
    const input = [
      "```json",
      "{ \"untagged\": true }",
      "```",
      "<!-- schema: system-brief -->",
      "```json",
      "{ \"tagged\": true }",
      "```"
    ].join("\n")
    expect(extractEmbeddedJson(input)).toEqual([
      { schema: "system-brief", json: { tagged: true } }
    ])
  })
})
