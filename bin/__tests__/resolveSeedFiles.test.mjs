import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { resolveSeedFiles } from "../lib/resolveSeedFiles.mjs"

describe("resolveSeedFiles", () => {
  let dir

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "vector-cli-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("returns a single feature-seed file as-is", async () => {
    const file = join(dir, "a.feature-seed.json")
    await writeFile(file, "{}")
    const result = await resolveSeedFiles([file])
    expect(result.files).toEqual([file])
    expect(result.missing).toEqual([])
  })

  it("recurses into a directory, picks only *.feature-seed.json", async () => {
    await writeFile(join(dir, "FT-001.feature-seed.json"), "{}")
    await writeFile(join(dir, "FT-002.feature-seed.json"), "{}")
    await writeFile(join(dir, "ignore.json"), "{}")
    await writeFile(join(dir, "notes.md"), "x")
    const sub = join(dir, "nested")
    await mkdir(sub)
    await writeFile(join(sub, "FT-003.feature-seed.json"), "{}")

    const result = await resolveSeedFiles([dir])

    expect(result.files.sort()).toEqual([
      join(dir, "FT-001.feature-seed.json"),
      join(dir, "FT-002.feature-seed.json"),
      join(sub, "FT-003.feature-seed.json")
    ].sort())
    expect(result.missing).toEqual([])
  })

  it("flags missing paths and returns existing ones", async () => {
    const file = join(dir, "exists.feature-seed.json")
    await writeFile(file, "{}")
    const ghost = join(dir, "ghost.feature-seed.json")
    const result = await resolveSeedFiles([file, ghost])
    expect(result.files).toEqual([file])
    expect(result.missing).toEqual([ghost])
  })

  it("returns empty result for empty input", async () => {
    expect(await resolveSeedFiles([])).toEqual({ files: [], missing: [] })
  })

  it("dedupes when same file is passed twice", async () => {
    const file = join(dir, "dup.feature-seed.json")
    await writeFile(file, "{}")
    const result = await resolveSeedFiles([file, file])
    expect(result.files).toEqual([file])
  })
})
