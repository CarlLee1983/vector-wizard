import { describe, expect, it } from "vitest"
import { parseImportArgs } from "../lib/parseImportArgs.mjs"

describe("parseImportArgs", () => {
  it("returns default command when argv has no extra arg", () => {
    expect(parseImportArgs(["node", "cli.js"])).toEqual({ command: "default" })
  })

  it("returns default command for unknown subcommand", () => {
    expect(parseImportArgs(["node", "cli.js", "build"])).toEqual({ command: "default" })
  })

  it("parses 'import' with one path", () => {
    const result = parseImportArgs(["node", "cli.js", "import", "./a.json"])
    expect(result).toEqual({ command: "import", paths: ["./a.json"] })
  })

  it("parses 'import' with multiple paths", () => {
    const result = parseImportArgs(["node", "cli.js", "import", "./a.json", "./b.json", "./seeds/"])
    expect(result).toEqual({ command: "import", paths: ["./a.json", "./b.json", "./seeds/"] })
  })

  it("returns import command with empty paths when no path provided", () => {
    expect(parseImportArgs(["node", "cli.js", "import"])).toEqual({ command: "import", paths: [] })
  })
})
