import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import Ajv from "ajv"
import { describe, expect, it } from "vitest"

const SCHEMAS_DIR = resolve(__dirname, "../../docs/methodology/schemas")

function loadSchema(filename: string): object {
  const path = resolve(SCHEMAS_DIR, filename)
  return JSON.parse(readFileSync(path, "utf8"))
}

function newAjv(): Ajv {
  return new Ajv({ allErrors: true, strict: false })
}

describe("methodology schemas — harness", () => {
  it("schemas directory exists and is reachable", () => {
    expect(() => readdirSync(SCHEMAS_DIR)).not.toThrow()
  })

  it("ajv can be instantiated", () => {
    const ajv = newAjv()
    expect(ajv).toBeDefined()
  })
})

export { loadSchema, newAjv, SCHEMAS_DIR }
