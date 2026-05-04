import { describe, expect, it, vi } from "vitest"
import { runAction } from "../services/localAgent/actionRunner"
import { minimalValidDraft } from "../test/fixtures"

describe("runAction", () => {
  it("returns preview ActionResult on successful rewrite", async () => {
    const fakeSpawnAgent = vi.fn().mockResolvedValue({
      text: [
        "```vector-action",
        JSON.stringify({
          preview: {
            text: "身為訪客，我想要看到清楚的錯誤訊息，以便了解下一步。",
            targetPath: "epics[0].stories[0].userStory",
            mode: "replace"
          }
        }),
        "```"
      ].join("\n"),
      exitCode: 0
    })
    const result = await runAction({
      actionId: "stories.rewrite",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("preview")
    expect(fakeSpawnAgent).toHaveBeenCalledTimes(1)
    const call = fakeSpawnAgent.mock.calls[0][0]
    expect(call.disallowedTools).toContain("Bash")
    expect(call.cwd).toBe("/tmp")
    expect(typeof call.prompt).toBe("string")
    expect(call.prompt.length).toBeGreaterThan(0)
  })

  it("returns notes ActionResult for gaps action", async () => {
    const fakeSpawnAgent = vi.fn().mockResolvedValue({
      text: [
        "```vector-action",
        JSON.stringify({
          notes: [{ severity: "warning", text: "Missing admin role" }]
        }),
        "```"
      ].join("\n"),
      exitCode: 0
    })
    const result = await runAction({
      actionId: "stories.gaps",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("notes")
  })

  it("returns parse_error when output has no fence", async () => {
    const fakeSpawnAgent = vi.fn().mockResolvedValue({ text: "free text", exitCode: 0 })
    const result = await runAction({
      actionId: "stories.gaps",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("parse_error")
  })

  it("returns run_error when spawnAgent throws", async () => {
    const fakeSpawnAgent = vi.fn().mockRejectedValue(new Error("CLI not found"))
    const result = await runAction({
      actionId: "stories.rewrite",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("run_error")
    if (result.kind === "run_error") {
      expect(result.message).toMatch(/CLI not found/)
    }
  })

  it("returns run_error for unknown actionId", async () => {
    const result = await runAction({
      actionId: "nope.nope",
      draft: minimalValidDraft(),
      cwd: "/tmp",
      spawnAgent: vi.fn()
    })
    expect(result.kind).toBe("run_error")
  })
})
