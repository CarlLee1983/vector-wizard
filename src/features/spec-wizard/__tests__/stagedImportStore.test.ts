import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, mkdir, writeFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { STAGED_IMPORT_RELATIVE, consumeStagedDrafts } from "../services/stagedImportStore"

describe("consumeStagedDrafts", () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "vector-staged-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("uses the same relative path as the CLI module", () => {
    expect(STAGED_IMPORT_RELATIVE).toBe(".vector/import/pending.json")
  })

  it("returns empty drafts when pending.json does not exist", async () => {
    const result = await consumeStagedDrafts(dir)
    expect(result).toEqual({ drafts: [] })
  })

  it("returns drafts and deletes the file when pending.json exists", async () => {
    const target = join(dir, STAGED_IMPORT_RELATIVE)
    await mkdir(join(dir, ".vector", "import"), { recursive: true })
    await writeFile(
      target,
      JSON.stringify({
        stagedAt: "2026-04-29T00:00:00.000Z",
        drafts: [{ sourcePath: "a", draft: { metadata: { title: "T" } } }]
      })
    )

    const result = await consumeStagedDrafts(dir)

    expect(result.drafts).toEqual([{ sourcePath: "a", draft: { metadata: { title: "T" } } }])
    const remaining = await readdir(join(dir, ".vector", "import"))
    expect(remaining).toEqual([])
  })

  it("returns empty drafts when pending.json is malformed and removes the corrupt file", async () => {
    const target = join(dir, STAGED_IMPORT_RELATIVE)
    await mkdir(join(dir, ".vector", "import"), { recursive: true })
    await writeFile(target, "not json")

    const result = await consumeStagedDrafts(dir)

    expect(result).toEqual({ drafts: [] })
    const remaining = await readdir(join(dir, ".vector", "import"))
    expect(remaining).toEqual([])
  })
})
