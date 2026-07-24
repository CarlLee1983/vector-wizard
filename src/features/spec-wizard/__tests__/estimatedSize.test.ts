import { describe, expect, it } from "vitest"
import { minimalValidDraft } from "../test/fixtures"
import { normalizeDraft } from "../persistence/draftStorage"
import { draftToYaml } from "../services/yamlSerializer"
import { yamlToDraft } from "../services/yamlParser"

/**
 * estimatedSize（T-shirt 估算）跨越 Path B → Wizard → YAML 的完整路徑。
 *
 * 這個欄位存在的唯一理由，是讓 Slice 階段評出來的相對工時不要在交接時蒸發
 * （見 docs/project-history.md）。因此「大小寫不敏感的匯入」不是防禦性寫法，
 * 而是這個功能的核心需求：Path B 的 Stage 3 schema 產出的是大寫 S/M/L/XL。
 */

describe("estimatedSize：型別與匯出", () => {
  it("有值時寫進 YAML 的 metadata", () => {
    const draft = minimalValidDraft()
    draft.metadata.estimatedSize = "m"
    expect(draftToYaml(draft)).toContain('estimatedSize: "m"')
  })

  it("未設定時完全不出現在 YAML（與其他選填欄位一致）", () => {
    const draft = minimalValidDraft()
    expect(draft.metadata.estimatedSize).toBeUndefined()
    expect(draftToYaml(draft)).not.toContain("estimatedSize")
  })

  it("YAML schemaVersion 已 bump 到 0.3", () => {
    expect(draftToYaml(minimalValidDraft())).toContain('schemaVersion: "0.3"')
  })
})

describe("estimatedSize：匯入正規化", () => {
  it("接受 Path B Stage 3 產出的大寫值並轉為小寫", () => {
    // feature-candidates.schema.json 的 estimatedSize enum 是 ["S","M","L","XL"]。
    // Stage 4 應在交接時轉小寫，但就算漏轉，匯入也必須成立。
    for (const [input, expected] of [
      ["S", "s"],
      ["M", "m"],
      ["L", "l"],
      ["XL", "xl"]
    ] as const) {
      const normalized = normalizeDraft({
        ...minimalValidDraft(),
        metadata: { ...minimalValidDraft().metadata, estimatedSize: input }
      })
      expect(normalized.metadata.estimatedSize).toBe(expected)
    }
  })

  it("已是小寫時原樣保留", () => {
    const normalized = normalizeDraft({
      ...minimalValidDraft(),
      metadata: { ...minimalValidDraft().metadata, estimatedSize: "xl" }
    })
    expect(normalized.metadata.estimatedSize).toBe("xl")
  })

  it("丟棄不在值域內的值，而不是原樣塞進 draft", () => {
    // XS 是提案階段的產物，Path B 從來產不出來；別讓它悄悄進到型別裡。
    for (const bogus of ["xs", "XXL", "medium", "", 3, null]) {
      const normalized = normalizeDraft({
        ...minimalValidDraft(),
        metadata: { ...minimalValidDraft().metadata, estimatedSize: bogus }
      })
      expect(normalized.metadata.estimatedSize).toBeUndefined()
    }
  })

  it("缺欄位時不會憑空生出預設值", () => {
    const normalized = normalizeDraft(minimalValidDraft())
    expect(normalized.metadata.estimatedSize).toBeUndefined()
  })
})

describe("estimatedSize：YAML round-trip", () => {
  it("匯出再匯入後值不變", () => {
    const draft = minimalValidDraft()
    draft.metadata.estimatedSize = "l"
    expect(yamlToDraft(draftToYaml(draft)).draft.metadata.estimatedSize).toBe("l")
  })

  it("仍能匯入沒有 estimatedSize 的 0.2 舊檔", () => {
    const legacy = draftToYaml(minimalValidDraft()).replace('schemaVersion: "0.3"', 'schemaVersion: "0.2"')
    const { schemaVersion, draft } = yamlToDraft(legacy)
    expect(schemaVersion).toBe("0.2")
    expect(draft.metadata.estimatedSize).toBeUndefined()
    expect(draft.metadata.title).toBe(minimalValidDraft().metadata.title)
  })
})
