import { readdirSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import Ajv from "ajv"
import { describe, expect, it } from "vitest"
import { validateDraft } from "@/features/spec-wizard/model/validation"
import type { FeatureDraft } from "@/features/spec-wizard/model/specTypes"
import { extractEmbeddedJson } from "./extractEmbeddedJson"

const SCHEMAS_DIR = resolve(__dirname, "../../docs/methodology/schemas")
const REFERENCE_DIR = resolve(__dirname, "../../docs/methodology/reference-case")

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

describe("capability-list schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    capabilities: [
      {
        id: "CAP-001",
        name: "Authenticated dashboard access",
        description: "Authorized users sign in and view scoped dashboards.",
        actors: ["Ops Analyst"],
        jobs: ["Sign in"],
        events: ["UserAuthenticated"]
      }
    ]
  }

  it("validates a complete fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    expect(ajv.compile(schema)(goodFixture)).toBe(true)
  })

  it("rejects a malformed capability id", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    const bad = {
      ...goodFixture,
      capabilities: [{ ...goodFixture.capabilities[0], id: "cap-1" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects an empty capabilities array", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    const bad = { ...goodFixture, capabilities: [] }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("capability-list.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})

describe("feature-candidates schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    features: [
      {
        id: "FT-001",
        title: "SSO sign-in",
        oneLineGoal: "Internal users sign in via corporate SSO.",
        linkedCapabilities: ["CAP-001"],
        priority: "must",
        estimatedSize: "M",
        dependsOn: [],
        rationale: "Walking skeleton — nothing else can ship without auth."
      }
    ]
  }

  it("validates a complete fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    expect(ajv.compile(schema)(goodFixture)).toBe(true)
  })

  it("rejects an invalid priority", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    const bad = {
      ...goodFixture,
      features: [{ ...goodFixture.features[0], priority: "maybe" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects an invalid estimatedSize", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    const bad = {
      ...goodFixture,
      features: [{ ...goodFixture.features[0], estimatedSize: "huge" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects malformed feature id", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    const bad = {
      ...goodFixture,
      features: [{ ...goodFixture.features[0], id: "feature-1" }]
    }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-candidates.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})

describe("feature-seed schema", () => {
  const goodFixture = {
    schemaVersion: "0.1",
    metadata: { title: "SSO sign-in", owner: "", locale: "zh-TW" },
    summary: { problem: "缺少統一登入。", desiredOutcome: "SSO 一鍵進入儀表板。" },
    goal: {
      statement: "讓內部使用者透過企業 SSO 登入並抵達個人化儀表板。",
      successSignals: ["首次登入時間少於 30 秒"]
    },
    impacts: [{ id: "IM-001", actor: "Ops Analyst", impact: "免於重複登入" }],
    deliverables: [{ id: "DE-001", name: "SSO 登入流程", description: "OIDC/SAML 整合" }],
    userActivities: [{ id: "UA-001", actor: "Ops Analyst", activity: "用企業帳號登入" }],
    epics: [
      {
        id: "EP-001",
        title: "登入與身分",
        stories: [
          {
            id: "US-001",
            title: "SSO 一鍵登入",
            userStory: "身為 Ops Analyst，我希望用 SSO 一鍵登入。",
            acceptanceCriteria: [{ id: "AC-001", statement: "點擊『SSO 登入』後 5 秒內導向首頁。" }],
            examples: [
              {
                id: "EX-001",
                format: "given-when-then",
                given: "已登入企業 IdP",
                when: "點擊 SSO 登入按鈕",
                then: "5 秒內進入個人化儀表板"
              }
            ]
          }
        ]
      }
    ],
    agentBoundaries: {
      nonGoals: ["不支援外部客戶登入"],
      constraints: ["必須使用既有 IdP"],
      testExpectations: ["SSO 重定向回流的單元測試"],
      risks: ["既有查詢層在規模化下效能不足"],
      openQuestions: ["儀表板 schema 由誰負責？"]
    }
  }

  it("validates a complete feature-seed fixture", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    expect(ajv.compile(schema)(goodFixture)).toBe(true)
  })

  it("rejects feature-seed missing metadata.title", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const bad = { ...goodFixture, metadata: { ...goodFixture.metadata, title: "" } }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects feature-seed missing goal.statement", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const bad = { ...goodFixture, goal: { ...goodFixture.goal, statement: "" } }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("rejects feature-seed with no story", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    const bad = { ...goodFixture, epics: [] }
    expect(ajv.compile(schema)(bad)).toBe(false)
  })

  it("good fixture also passes wizard validateDraft without blocking errors", () => {
    const { schemaVersion: _v, ...draft } = goodFixture
    const result = validateDraft(draft as FeatureDraft)
    expect(result.blockingErrors).toEqual([])
  })

  it("schema is valid JSON Schema", () => {
    const ajv = newAjv()
    const schema = loadSchema("feature-seed.schema.json")
    expect(() => ajv.compile(schema)).not.toThrow()
  })
})

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry)
    if (statSync(path).isDirectory()) {
      out.push(...walk(path))
    } else {
      out.push(path)
    }
  }
  return out
}

describe("reference-case sweep", () => {
  const ajv = newAjv()
  const compiled = {
    "system-brief": ajv.compile(loadSchema("system-brief.schema.json")),
    "capability-list": ajv.compile(loadSchema("capability-list.schema.json")),
    "feature-candidates": ajv.compile(loadSchema("feature-candidates.schema.json")),
    "feature-seed": ajv.compile(loadSchema("feature-seed.schema.json"))
  } as const
  type SchemaName = keyof typeof compiled

  const files = walk(REFERENCE_DIR)

  for (const file of files.filter((f) => f.endsWith(".md"))) {
    it(`embedded JSON in ${file.replace(REFERENCE_DIR + "/", "")} validates against its declared schema`, () => {
      const md = readFileSync(file, "utf8")
      const blocks = extractEmbeddedJson(md)
      for (const block of blocks) {
        expect(Object.keys(compiled)).toContain(block.schema)
        const validate = compiled[block.schema as SchemaName]
        const ok = validate(block.json)
        if (!ok) {
          throw new Error(
            `${file} → schema=${block.schema} failed:\n${ajv.errorsText(validate.errors, { separator: "\n" })}`
          )
        }
      }
    })
  }

  for (const file of files.filter((f) => f.endsWith(".feature-seed.json"))) {
    it(`feature-seed file ${file.replace(REFERENCE_DIR + "/", "")} validates against feature-seed schema and wizard validateDraft`, () => {
      const json = JSON.parse(readFileSync(file, "utf8"))
      expect(compiled["feature-seed"](json)).toBe(true)
      const { schemaVersion: _v, ...draft } = json
      const result = validateDraft(draft as FeatureDraft)
      expect(result.blockingErrors).toEqual([])
    })
  }
})

export { loadSchema, newAjv, SCHEMAS_DIR }
