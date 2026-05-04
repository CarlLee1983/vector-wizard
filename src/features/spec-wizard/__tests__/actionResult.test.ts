import { describe, expect, it } from "vitest"
import { parseActionResult } from "../services/localAgent/actionResult"

describe("parseActionResult", () => {
  it("parses a valid preview fence", () => {
    const raw = [
      "Some chatter before",
      "```vector-action",
      JSON.stringify({
        preview: {
          text: "身為 PM，我想要 X，以便 Y。",
          targetPath: "epics[0].stories[0].userStory",
          mode: "replace"
        }
      }),
      "```",
      "trailing text"
    ].join("\n")
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("preview")
    if (result.kind === "preview") {
      expect(result.actionId).toBe("stories.rewrite")
      expect(result.preview.text).toMatch(/PM/)
      expect(result.preview.targetPath).toBe("epics[0].stories[0].userStory")
      expect(result.preview.mode).toBe("replace")
    }
  })

  it("parses a valid notes fence", () => {
    const raw = [
      "```vector-action",
      JSON.stringify({
        notes: [
          { severity: "warning", text: "Missing role: admin" },
          { severity: "info", text: "Consider edge case" }
        ]
      }),
      "```"
    ].join("\n")
    const result = parseActionResult(raw, "stories.gaps")
    expect(result.kind).toBe("notes")
    if (result.kind === "notes") {
      expect(result.notes).toHaveLength(2)
      expect(result.notes[0].severity).toBe("warning")
    }
  })

  it("returns parse_error when no fence present", () => {
    const result = parseActionResult("just plain text without fence", "stories.gaps")
    expect(result.kind).toBe("parse_error")
    if (result.kind === "parse_error") {
      expect(result.actionId).toBe("stories.gaps")
      expect(result.raw).toBe("just plain text without fence")
    }
  })

  it("returns parse_error on malformed JSON inside fence", () => {
    const raw = "```vector-action\n{ this is not json\n```"
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("parse_error")
  })

  it("returns parse_error when shape does not match preview or notes", () => {
    const raw = `\`\`\`vector-action\n${JSON.stringify({ unexpected: "shape" })}\n\`\`\``
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("parse_error")
  })

  it("rejects preview with invalid mode", () => {
    const raw = `\`\`\`vector-action\n${JSON.stringify({
      preview: { text: "x", targetPath: "epics[0].stories[0].userStory", mode: "bogus" }
    })}\n\`\`\``
    const result = parseActionResult(raw, "stories.rewrite")
    expect(result.kind).toBe("parse_error")
  })

  it("rejects notes with empty array", () => {
    const raw = `\`\`\`vector-action\n${JSON.stringify({ notes: [] })}\n\`\`\``
    const result = parseActionResult(raw, "stories.gaps")
    expect(result.kind).toBe("parse_error")
  })

  it("takes the first vector-action fence when multiple exist", () => {
    const raw = [
      "```vector-action",
      JSON.stringify({ notes: [{ severity: "info", text: "first" }] }),
      "```",
      "filler",
      "```vector-action",
      JSON.stringify({ notes: [{ severity: "warning", text: "second" }] }),
      "```"
    ].join("\n")
    const result = parseActionResult(raw, "stories.gaps")
    expect(result.kind).toBe("notes")
    if (result.kind === "notes") {
      expect(result.notes[0].text).toBe("first")
    }
  })
})
