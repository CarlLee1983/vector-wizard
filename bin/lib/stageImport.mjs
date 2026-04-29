import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

// 與 src/features/spec-wizard/services/stagedImportStore.ts 共用的契約。
// 修改此值時，請同步更新該 TS 模組的 STAGED_IMPORT_RELATIVE。
export const STAGED_IMPORT_RELATIVE = ".vector/import/pending.json"

export async function stageImport({ baseDir, drafts }) {
  const target = join(baseDir, STAGED_IMPORT_RELATIVE)
  await mkdir(dirname(target), { recursive: true })
  const payload = {
    stagedAt: new Date().toISOString(),
    drafts
  }
  await writeFile(target, JSON.stringify(payload, null, 2), "utf-8")
}
