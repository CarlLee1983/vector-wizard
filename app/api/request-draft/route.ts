import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: Request) {
  try {
    const { title, owner, locale } = await request.json()
    const requestPath = join(process.cwd(), ".vector", "draft_request.json")
    
    await mkdir(join(process.cwd(), ".vector"), { recursive: true })
    await writeFile(requestPath, JSON.stringify({
      title,
      owner,
      locale,
      status: "pending",
      requestedAt: new Date().toISOString()
    }, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send request to agent" }, { status: 500 })
  }
}
