import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { STAGED_IMPORT_RELATIVE, stageImport } from "../lib/stageImport.mjs"

describe("stageImport", () => {
  let dir

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "vector-stage-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("exposes the canonical relative path constant", () => {
    expect(STAGED_IMPORT_RELATIVE).toBe(".vector/import/pending.json")
  })

  it("writes pending.json with stagedAt and drafts wrapped with sourcePath", async () => {
    const draft1 = { metadata: { title: "Foo" } }
    const draft2 = { metadata: { title: "Bar" } }

    await stageImport({
      baseDir: dir,
      drafts: [
        { sourcePath: "/abs/foo.feature-seed.json", draft: draft1 },
        { sourcePath: "/abs/bar.feature-seed.json", draft: draft2 }
      ]
    })

    const raw = await readFile(join(dir, STAGED_IMPORT_RELATIVE), "utf-8")
    const parsed = JSON.parse(raw)
    expect(typeof parsed.stagedAt).toBe("string")
    expect(new Date(parsed.stagedAt).toString()).not.toBe("Invalid Date")
    expect(parsed.drafts).toEqual([
      { sourcePath: "/abs/foo.feature-seed.json", draft: draft1 },
      { sourcePath: "/abs/bar.feature-seed.json", draft: draft2 }
    ])
  })

  it("creates parent .vector/import directory when missing", async () => {
    await stageImport({ baseDir: dir, drafts: [] })
    const info = await stat(join(dir, ".vector", "import"))
    expect(info.isDirectory()).toBe(true)
  })

  it("overwrites a previous staging file", async () => {
    await stageImport({ baseDir: dir, drafts: [{ sourcePath: "a", draft: { v: 1 } }] })
    await stageImport({ baseDir: dir, drafts: [{ sourcePath: "b", draft: { v: 2 } }] })
    const raw = await readFile(join(dir, STAGED_IMPORT_RELATIVE), "utf-8")
    expect(JSON.parse(raw).drafts).toEqual([{ sourcePath: "b", draft: { v: 2 } }])
  })
})
