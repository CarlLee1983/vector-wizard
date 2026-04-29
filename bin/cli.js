#!/usr/bin/env node

import { spawn } from "child_process"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "url"
import { dirname, join, relative } from "path"
import { existsSync } from "fs"

import { parseImportArgs } from "./lib/parseImportArgs.mjs"
import { resolveSeedFiles } from "./lib/resolveSeedFiles.mjs"
import { validateSeedShape } from "./lib/validateSeedShape.mjs"
import { stageImport } from "./lib/stageImport.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, "..")
const cwd = process.cwd()

console.log("\nVector Agile Roadmap Wizard")
console.log("---------------------------")

const parsed = parseImportArgs(process.argv)

if (parsed.command === "import") {
  const success = await runImport(parsed.paths)
  if (!success) {
    process.exit(1)
  }
}

const isProd = existsSync(join(projectRoot, ".next"))
const script = isProd ? "start" : "dev"

console.log(`Mode: ${isProd ? "Production" : "Development"}`)
console.log(`Project Root: ${projectRoot}`)
console.log(`Launching server via ${script}...\n`)

const child = spawn("npm", ["run", script], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true
})

child.on("error", (err) => {
  console.error("Failed to start server:", err.message)
  process.exit(1)
})

async function runImport(paths) {
  if (paths.length === 0) {
    console.error("Usage: npx vector-wizard import <file-or-directory> [...]")
    return false
  }

  const { files, missing } = await resolveSeedFiles(paths)
  for (const m of missing) {
    console.warn(`  ! 路徑不存在或無法讀取，已略過：${m}`)
  }
  if (files.length === 0) {
    console.error("沒有任何 feature-seed JSON 檔可匯入。")
    return false
  }

  const drafts = []
  const failures = []
  for (const file of files) {
    try {
      const raw = await readFile(file, "utf-8")
      const json = JSON.parse(raw)
      const validation = validateSeedShape(json)
      if (!validation.valid) {
        failures.push({ file, reason: validation.reason })
        continue
      }
      drafts.push({ sourcePath: relative(cwd, file), draft: json })
    } catch (err) {
      failures.push({ file, reason: err.message })
    }
  }

  for (const f of failures) {
    console.warn(`  ! 跳過 ${relative(cwd, f.file)}：${f.reason}`)
  }

  if (drafts.length === 0) {
    console.error("沒有任何有效的 feature-seed JSON 可匯入。")
    return false
  }

  await stageImport({ baseDir: cwd, drafts })
  console.log(`\n  ✓ 已 stage ${drafts.length} 份 draft，啟動 wizard 後將自動匯入。`)
  for (const d of drafts) {
    console.log(`    · ${d.sourcePath}`)
  }
  console.log("")
  return true
}
