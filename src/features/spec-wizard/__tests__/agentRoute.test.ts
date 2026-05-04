import { describe, expect, it } from "vitest"
import { handleAgentRequest } from "../services/localAgent/agentRouteHandler"
import type { AgentEvent, LocalAgentProvider } from "../services/localAgent/types"

function makeProvider(events: AgentEvent[]): LocalAgentProvider {
  return {
    name: "fake",
    async *send() {
      for (const ev of events) yield ev
    }
  }
}

async function readSseChunks(response: Response): Promise<string[]> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  const chunks: string[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""
    for (const part of parts) {
      if (part.startsWith("data: ")) chunks.push(part.slice(6))
    }
  }
  return chunks
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" }
  })
}

describe("POST /api/agent (handleAgentRequest)", () => {
  it("streams provider events as SSE", async () => {
    const provider = makeProvider([
      { type: "system_init", sessionId: "s1", cwd: "/tmp" },
      { type: "assistant_text", text: "hi" },
      { type: "result", sessionId: "s1", isError: false }
    ])
    const response = await handleAgentRequest(makeRequest({ prompt: "test" }), provider, "/tmp")

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")

    const chunks = await readSseChunks(response)
    expect(chunks.map((c) => JSON.parse(c).type)).toEqual(["system_init", "assistant_text", "result"])
  })

  it("rejects non-JSON body with 400", async () => {
    const provider = makeProvider([])
    const req = new Request("http://localhost/api/agent", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" }
    })
    const response = await handleAgentRequest(req, provider, "/tmp")
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toMatch(/JSON/i)
  })

  it("rejects body without prompt with 400", async () => {
    const provider = makeProvider([])
    const response = await handleAgentRequest(makeRequest({ foo: "bar" }), provider, "/tmp")
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toMatch(/prompt/i)
  })

  it("rejects empty/whitespace prompt with 400", async () => {
    const provider = makeProvider([])
    const response = await handleAgentRequest(makeRequest({ prompt: "   " }), provider, "/tmp")
    expect(response.status).toBe(400)
  })

  it("emits a single error SSE event when the provider throws", async () => {
    const provider: LocalAgentProvider = {
      name: "broken",
      async *send() {
        throw new Error("boom")
      }
    }
    const response = await handleAgentRequest(makeRequest({ prompt: "test" }), provider, "/tmp")
    expect(response.status).toBe(200)
    const chunks = await readSseChunks(response)
    expect(chunks).toHaveLength(1)
    expect(JSON.parse(chunks[0])).toEqual({ type: "error", message: "boom" })
  })

  it("passes prompt and cwd through to provider", async () => {
    let capturedPrompt: string | undefined
    let capturedCwd: string | undefined
    const provider: LocalAgentProvider = {
      name: "spy",
      async *send({ prompt, cwd }) {
        capturedPrompt = prompt
        capturedCwd = cwd
        yield { type: "result", sessionId: "s", isError: false }
      }
    }
    await handleAgentRequest(makeRequest({ prompt: "hello pipeline" }), provider, "/work/dir")
    expect(capturedPrompt).toBe("hello pipeline")
    expect(capturedCwd).toBe("/work/dir")
  })
})
