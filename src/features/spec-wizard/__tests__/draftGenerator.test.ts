import { describe, expect, it, vi } from "vitest"
import { generateDraft } from "../services/localAgent/draftGenerator"

describe("generateDraft", () => {
  it("returns kind=draft with parsed JSON when agent emits a valid object", async () => {
    const draftJson = {
      metadata: { title: "Onboarding revamp", owner: "Annie", locale: "zh-TW" },
      goal: { statement: "Reduce drop-off" },
      epics: []
    }
    const fakeSpawnAgent = vi
      .fn()
      .mockResolvedValue({ text: ["```json", JSON.stringify(draftJson), "```"].join("\n"), exitCode: 0 })
    const result = await generateDraft({
      title: "Onboarding revamp",
      owner: "Annie",
      locale: "zh-TW",
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("draft")
    if (result.kind === "draft") {
      expect((result.draft as { metadata: { title: string } }).metadata.title).toBe("Onboarding revamp")
    }
  })

  it("returns kind=parse_error when agent output has no JSON", async () => {
    const fakeSpawnAgent = vi.fn().mockResolvedValue({ text: "Sorry, I cannot help with that.", exitCode: 0 })
    const result = await generateDraft({
      title: "X",
      locale: "en",
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("parse_error")
    if (result.kind === "parse_error") {
      expect(result.raw).toContain("Sorry")
    }
  })

  it("returns kind=run_error when spawnAgent throws", async () => {
    const fakeSpawnAgent = vi.fn().mockRejectedValue(new Error("claude binary missing"))
    const result = await generateDraft({
      title: "X",
      locale: "en",
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("run_error")
    if (result.kind === "run_error") {
      expect(result.message).toMatch(/claude binary missing/)
    }
  })

  it("returns kind=run_error when title is empty", async () => {
    const fakeSpawnAgent = vi.fn()
    const result = await generateDraft({
      title: "   ",
      locale: "en",
      cwd: "/tmp",
      spawnAgent: fakeSpawnAgent
    })
    expect(result.kind).toBe("run_error")
    expect(fakeSpawnAgent).not.toHaveBeenCalled()
  })

  it("passes seed prompt, cwd, signal and locks every mutating tool", async () => {
    const draftJson = { metadata: { title: "Z" }, goal: {}, epics: [] }
    const fakeSpawnAgent = vi.fn().mockResolvedValue({ text: JSON.stringify(draftJson), exitCode: 0 })
    const controller = new AbortController()
    await generateDraft({
      title: "Z",
      owner: "Bob",
      locale: "zh-TW",
      cwd: "/path/to/project",
      signal: controller.signal,
      spawnAgent: fakeSpawnAgent
    })
    expect(fakeSpawnAgent).toHaveBeenCalledTimes(1)
    const call = fakeSpawnAgent.mock.calls[0][0]
    expect(call.cwd).toBe("/path/to/project")
    expect(call.signal).toBe(controller.signal)
    expect(call.prompt).toContain("Z")
    expect(call.prompt).toContain("Bob")
    expect(call.prompt).toContain("Traditional Chinese")
    for (const tool of ["Bash", "Edit", "Write", "MultiEdit", "WebFetch"]) {
      expect(call.disallowedTools).toContain(tool)
    }
  })
})
