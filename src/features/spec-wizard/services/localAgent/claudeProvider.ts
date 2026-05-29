// Re-export shim：實作已搬至 ./providers/*。保留此檔以維持既有 import 路徑與測試。
export { spawnAgent, selectProvider } from "./providers"
export { parseStreamJsonLine } from "./providers/claude"
export type { SpawnAgentOptions, SpawnAgentResult } from "./providers/types"
