import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import type { ApiErrorResponse, HandoffRequest, HandoffResponse } from "@/features/spec-wizard/api/contracts"

function isHandoffRequest(value: unknown): value is HandoffRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "yaml" in value &&
    "title" in value &&
    typeof (value as HandoffRequest).yaml === "string" &&
    typeof (value as HandoffRequest).title === "string"
  )
}

export async function POST(request: Request): Promise<NextResponse<HandoffResponse | ApiErrorResponse>> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request: body must be JSON." }, { status: 400 })
  }

  if (!isHandoffRequest(body)) {
    return NextResponse.json({ error: "Invalid request: expected yaml and title strings." }, { status: 400 })
  }

  try {
    const specsDir = join(process.cwd(), "docs", "vector")
    await mkdir(specsDir, { recursive: true })

    const safeTitle = body.title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, "-").toLowerCase() || "feature-spec"
    const timestamp = new Date().toISOString().slice(0, 10) // Simplified YYYY-MM-DD for cleaner docs
    const fileName = `${timestamp}-${safeTitle}.yaml`
    const filePath = join(specsDir, fileName)

    await writeFile(filePath, body.yaml, "utf-8")

    return NextResponse.json({
      success: true,
      filePath: `docs/vector/${fileName}`
    })
  } catch (error) {
    console.error("Handoff failed:", error)
    return NextResponse.json({ error: "Failed to write spec to local filesystem." }, { status: 500 })
  }
}
