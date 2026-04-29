import { describe, expect, it } from "vitest"
import { YamlParseError, parseYamlDocument } from "../services/yamlParser"

describe("parseYamlDocument", () => {
  it("throws YamlParseError on empty input", () => {
    expect(() => parseYamlDocument("")).toThrow(YamlParseError)
    expect(() => parseYamlDocument("   \n  \n")).toThrow(YamlParseError)
  })
})
