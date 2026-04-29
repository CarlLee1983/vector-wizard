import { NextResponse } from "next/server"
import { consumeStagedDrafts } from "@/features/spec-wizard/services/stagedImportStore"

export async function POST() {
  try {
    const result = await consumeStagedDrafts(process.cwd())
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to read staged drafts" }, { status: 500 })
  }
}
