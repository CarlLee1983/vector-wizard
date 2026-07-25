import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  SUGGESTION_LOG_KEY,
  clearSuggestionLog,
  getSuggestionStats,
  recordSuggestionOutcome
} from "../persistence/suggestionLog"

/**
 * AI assist 建議的採用／拒絕記錄。純本機（localStorage），不外送——這條鏈受
 * AGENTS.md「single-user, no backend persistence」不變式與對外「資料不離開你的
 * 電腦」承諾約束。收集的目的只有一個：未來接真實 LLM 時能算出接受率來校準 prompt。
 * 詳見 docs/project-history.md。
 */

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe("suggestionLog：記錄與統計", () => {
  it("空狀態時每項為零，接受率為 0（不是 NaN）", () => {
    const stats = getSuggestionStats()
    expect(stats).toEqual({ adopted: 0, rejected: 0, total: 0, acceptanceRate: 0 })
  })

  it("採用與拒絕都算進分母，接受率是採用 / 總數", () => {
    recordSuggestionOutcome("a", "adopted")
    recordSuggestionOutcome("b", "adopted")
    recordSuggestionOutcome("c", "adopted")
    recordSuggestionOutcome("d", "rejected")

    expect(getSuggestionStats()).toEqual({ adopted: 3, rejected: 1, total: 4, acceptanceRate: 0.75 })
  })

  it("同一個 suggestionId 只算一次（終局結果，後寫覆蓋）", () => {
    recordSuggestionOutcome("x", "rejected")
    recordSuggestionOutcome("x", "adopted")

    expect(getSuggestionStats()).toEqual({ adopted: 1, rejected: 0, total: 1, acceptanceRate: 1 })
  })

  it("跨呼叫累積（讀回既有記錄後再追加）", () => {
    recordSuggestionOutcome("a", "adopted")
    recordSuggestionOutcome("b", "rejected")
    expect(getSuggestionStats().total).toBe(2)
  })

  it("clearSuggestionLog 清空", () => {
    recordSuggestionOutcome("a", "adopted")
    clearSuggestionLog()
    expect(getSuggestionStats().total).toBe(0)
  })
})

describe("suggestionLog：容錯", () => {
  it("localStorage 內容毀損時視為空，而非拋錯", () => {
    localStorage.setItem(SUGGESTION_LOG_KEY, "{ not valid json")
    expect(() => getSuggestionStats()).not.toThrow()
    expect(getSuggestionStats().total).toBe(0)
  })

  it("忽略非法的 outcome 值", () => {
    localStorage.setItem(SUGGESTION_LOG_KEY, JSON.stringify({ a: "adopted", b: "banana", c: 3 }))
    expect(getSuggestionStats()).toEqual({ adopted: 1, rejected: 0, total: 1, acceptanceRate: 1 })
  })

  it("localStorage 不存在時（SSR）record 與讀取都不拋錯", () => {
    const saved = globalThis.localStorage
    // @ts-expect-error 模擬伺服器端無 localStorage 的環境
    delete globalThis.localStorage
    try {
      expect(() => recordSuggestionOutcome("a", "adopted")).not.toThrow()
      expect(getSuggestionStats()).toEqual({ adopted: 0, rejected: 0, total: 0, acceptanceRate: 0 })
    } finally {
      globalThis.localStorage = saved
    }
  })
})
