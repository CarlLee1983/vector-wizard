import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { selectProvider } from "../services/localAgent/providers"

describe("selectProvider", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it("returns codex when VECTOR_AGENT=codex (case-insensitive)", () => {
    expect(selectProvider({ VECTOR_AGENT: "codex" }).name).toBe("codex")
    expect(selectProvider({ VECTOR_AGENT: "Codex" }).name).toBe("codex")
  })

  it("returns claude when VECTOR_AGENT=claude, empty, or unset", () => {
    expect(selectProvider({ VECTOR_AGENT: "claude" }).name).toBe("claude")
    expect(selectProvider({ VECTOR_AGENT: "" }).name).toBe("claude")
    expect(selectProvider({}).name).toBe("claude")
  })

  it("falls back to claude on unknown value and warns at most once", () => {
    expect(selectProvider({ VECTOR_AGENT: "gpt" }).name).toBe("claude")
    expect(selectProvider({ VECTOR_AGENT: "bard" }).name).toBe("claude")
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
