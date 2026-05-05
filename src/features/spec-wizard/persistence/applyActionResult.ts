import type { FeatureDraft } from "../model/specTypes"

export type ApplyActionResultInput = {
  targetPath: string
  mode: "insert" | "replace"
  value: unknown
}

type Segment = { kind: "key"; key: string } | { kind: "index"; index: number }

export function applyActionResultToDraft(draft: FeatureDraft, input: ApplyActionResultInput): FeatureDraft {
  if (input.mode === "insert") {
    throw new Error("insert mode is not supported in v1")
  }
  const segments = parsePath(input.targetPath)
  if (segments.length === 0) {
    throw new Error(`empty path: ${input.targetPath}`)
  }
  return setAtPath(draft, segments, input.value) as FeatureDraft
}

function parsePath(path: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  while (i < path.length) {
    if (path[i] === ".") {
      i += 1
      continue
    }
    if (path[i] === "[") {
      const end = path.indexOf("]", i)
      if (end < 0) throw new Error(`malformed path (missing ]): ${path}`)
      const inner = path.slice(i + 1, end)
      const n = Number(inner)
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`only numeric indices supported in v1; got: ${inner}`)
      }
      segments.push({ kind: "index", index: n })
      i = end + 1
      continue
    }
    let j = i
    while (j < path.length && path[j] !== "." && path[j] !== "[") j += 1
    if (j === i) throw new Error(`malformed path: ${path}`)
    segments.push({ kind: "key", key: path.slice(i, j) })
    i = j
  }
  return segments
}

function setAtPath(target: unknown, segments: Segment[], value: unknown): unknown {
  const [head, ...rest] = segments
  if (head.kind === "key") {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      throw new Error(`expected object at key "${head.key}"`)
    }
    const obj = target as Record<string, unknown>
    if (!(head.key in obj)) {
      throw new Error(`unknown key: "${head.key}"`)
    }
    if (rest.length === 0) {
      return { ...obj, [head.key]: value }
    }
    return { ...obj, [head.key]: setAtPath(obj[head.key], rest, value) }
  }
  if (!Array.isArray(target)) {
    throw new Error(`expected array at index [${head.index}]`)
  }
  if (head.index < 0 || head.index >= target.length) {
    throw new Error(`index out of bounds: [${head.index}]`)
  }
  const arr = target.slice()
  if (rest.length === 0) {
    arr[head.index] = value
  } else {
    arr[head.index] = setAtPath(arr[head.index], rest, value)
  }
  return arr
}
