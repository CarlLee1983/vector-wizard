type Listener = (prompt: string) => void

let currentListener: Listener | null = null

export function subscribeAssistant(listener: Listener): () => void {
  currentListener = listener
  return () => {
    if (currentListener === listener) currentListener = null
  }
}

export function sendToAssistant(prompt: string): boolean {
  if (!currentListener) return false
  currentListener(prompt)
  return true
}

export function __resetAssistantBridge(): void {
  currentListener = null
}
