export function parseImportArgs(argv) {
  const args = argv.slice(2)
  if (args.length === 0) return { command: "default" }
  if (args[0] !== "import") return { command: "default" }
  return { command: "import", paths: args.slice(1) }
}
