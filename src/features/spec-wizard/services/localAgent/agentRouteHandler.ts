import { NextResponse } from "next/server"
import type { LocalAgentProvider } from "./types"

export async function handleAgentRequest(
  request: Request,
  provider: LocalAgentProvider,
  cwd: string
): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request: body must be JSON." }, { status: 400 })
  }

  const promptValue = (body as { prompt?: unknown } | null)?.prompt
  if (typeof promptValue !== "string") {
    return NextResponse.json({ error: "Invalid request: expected { prompt: string }." }, { status: 400 })
  }
  const prompt = promptValue.trim()
  if (!prompt) {
    return NextResponse.json({ error: "Invalid request: prompt must not be empty." }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of provider.send({ prompt, cwd, signal: request.signal })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  })
}
