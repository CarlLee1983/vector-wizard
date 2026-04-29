import { readFile, unlink } from "node:fs/promises"
import { join } from "node:path"

// 與 bin/lib/stageImport.mjs 共用的契約。修改路徑時請同步更新。
export const STAGED_IMPORT_RELATIVE = ".vector/import/pending.json"

export type StagedDraftEntry = {
  sourcePath: string
  draft: unknown
}

export type ConsumeResult = {
  drafts: StagedDraftEntry[]
}

export async function consumeStagedDrafts(baseDir: string): Promise<ConsumeResult> {
  const target = join(baseDir, STAGED_IMPORT_RELATIVE)
  let raw: string
  try {
    raw = await readFile(target, "utf-8")
  } catch {
    return { drafts: [] }
  }

  let drafts: StagedDraftEntry[] = []
  try {
    const parsed = JSON.parse(raw) as { drafts?: unknown }
    if (Array.isArray(parsed?.drafts)) {
      drafts = parsed.drafts.filter(
        (entry): entry is StagedDraftEntry =>
          entry != null &&
          typeof entry === "object" &&
          typeof (entry as StagedDraftEntry).sourcePath === "string" &&
          (entry as StagedDraftEntry).draft != null
      )
    }
  } catch {
    drafts = []
  }

  try {
    await unlink(target)
  } catch {
    // file already gone; safe to ignore
  }

  return { drafts }
}
