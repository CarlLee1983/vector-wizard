/**
 * AI assist 建議的採用／拒絕記錄。
 *
 * 純本機：只寫 localStorage，永不外送。這受 AGENTS.md「single-user, no backend
 * persistence」不變式與對外「資料不離開你的電腦」承諾約束。收集的唯一目的，是讓
 * 未來接真實 LLM 時能算出接受率（採用 / (採用 + 拒絕)）來校準 prompt——所以拒絕
 * 和採用一樣要記，沒有分母就算不出接受率。
 *
 * 消費入口是 `getSuggestionStats()`；在校準功能出現之前，資料先在這裡累積。
 */

export const SUGGESTION_LOG_KEY = "vector.suggestionLog.v1"

export type SuggestionOutcome = "adopted" | "rejected"

export type SuggestionStats = {
  adopted: number
  rejected: number
  total: number
  /** 採用 / 總數；總數為 0 時回傳 0（而非 NaN）。 */
  acceptanceRate: number
}

type SuggestionLog = Record<string, SuggestionOutcome>

function isOutcome(value: unknown): value is SuggestionOutcome {
  return value === "adopted" || value === "rejected"
}

function readLog(): SuggestionLog {
  if (typeof localStorage === "undefined") return {}
  const raw = localStorage.getItem(SUGGESTION_LOG_KEY)
  if (raw == null) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object") return {}
    // 只收下值域內的條目，忽略毀損或被竄改的內容——記錄毀損不該讓 wizard 壞掉。
    const clean: SuggestionLog = {}
    for (const [id, outcome] of Object.entries(parsed as Record<string, unknown>)) {
      if (isOutcome(outcome)) clean[id] = outcome
    }
    return clean
  } catch {
    return {}
  }
}

/**
 * 記下某個 suggestionId 的終局結果。同一個 id 後寫覆蓋（採用後即從堆疊移除，
 * 實務上每個 id 只會被記一次；覆蓋只是防禦性語意，不是常態）。
 */
export function recordSuggestionOutcome(suggestionId: string, outcome: SuggestionOutcome): void {
  if (typeof localStorage === "undefined") return
  if (!suggestionId) return
  const log = readLog()
  log[suggestionId] = outcome
  try {
    localStorage.setItem(SUGGESTION_LOG_KEY, JSON.stringify(log))
  } catch {
    // localStorage 寫入失敗（配額 / 隱私模式）不該打斷使用流程；校準資料是可犧牲的。
  }
}

export function getSuggestionStats(): SuggestionStats {
  const outcomes = Object.values(readLog())
  const adopted = outcomes.filter((o) => o === "adopted").length
  const rejected = outcomes.filter((o) => o === "rejected").length
  const total = adopted + rejected
  return { adopted, rejected, total, acceptanceRate: total === 0 ? 0 : adopted / total }
}

export function clearSuggestionLog(): void {
  if (typeof localStorage === "undefined") return
  localStorage.removeItem(SUGGESTION_LOG_KEY)
}
