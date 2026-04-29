import { stat, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"

const FEATURE_SEED_SUFFIX = ".feature-seed.json"

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walk(full)))
    } else if (entry.isFile() && entry.name.endsWith(FEATURE_SEED_SUFFIX)) {
      out.push(full)
    }
  }
  return out
}

export async function resolveSeedFiles(paths) {
  const files = []
  const missing = []
  const seen = new Set()

  for (const p of paths) {
    const absolute = resolve(p)
    let info
    try {
      info = await stat(absolute)
    } catch {
      missing.push(p)
      continue
    }
    if (info.isDirectory()) {
      const found = await walk(absolute)
      for (const f of found) {
        if (!seen.has(f)) {
          seen.add(f)
          files.push(f)
        }
      }
    } else if (info.isFile()) {
      if (!seen.has(absolute)) {
        seen.add(absolute)
        files.push(absolute)
      }
    } else {
      missing.push(p)
    }
  }

  return { files, missing }
}
