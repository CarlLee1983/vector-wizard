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

describe("system-brief schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    oneLiner: "This is a reporting platform, helping ops teams solve manual spreadsheet pain.",
    problem: ["Reports take 4 hours/week"],
    nonProblems: ["External customer dashboards"],
    targetUsers: [{ role: "Ops Analyst", context: "Weekly KPI review" }],
    successSignals: ["Reduce report generation from 4 hours to 30 minutes"],
    uniqueValue: "Single source of truth pulled from production databases.",
    keyMetrics: [{ name: "Weekly report time", target: "< 30 min" }],
    constraints: ["Use existing Snowflake warehouse"],
    riskiestAssumptions: ["Query layer scales"],
    openQuestions: ["Who owns dashboards?"]
  }

  it("validates a complete fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    const validate = ajv.compile(schema)
    expect(validate(goodFixture)).toBe(true)
  })

  it("rejects a fixture missing required oneLiner", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    const validate = ajv.compile(schema)
    const bad = { ...goodFixture, oneLiner: undefined }
    expect(validate(bad)).toBe(false)
  })

  it("rejects a fixture with wrong schemaVersion", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    const validate = ajv.compile(schema)
    const bad = { ...goodFixture, schemaVersion: "0.0" }
    expect(validate(bad)).toBe(false)
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("system-brief.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})

export { loadSchema, newAjv, SCHEMAS_DIR }
