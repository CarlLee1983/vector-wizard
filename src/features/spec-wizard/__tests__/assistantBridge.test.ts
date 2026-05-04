import { afterEach, describe, expect, it, vi } from "vitest"
import { __resetAssistantBridge, sendToAssistant, subscribeAssistant } from "../services/localAgent/assistantBridge"

describe("assistantBridge", () => {
  afterEach(() => __resetAssistantBridge())

  it("returns false from sendToAssistant when no listener is registered", () => {
    expect(sendToAssistant("hi")).toBe(false)
  })

  it("delivers the prompt to a subscribed listener", () => {
    const listener = vi.fn()
    subscribeAssistant(listener)
    expect(sendToAssistant("run pipeline")).toBe(true)
    expect(listener).toHaveBeenCalledWith("run pipeline")
  })

  it("replaces an earlier listener when subscribeAssistant is called again", () => {
    const first = vi.fn()
    const second = vi.fn()
    subscribeAssistant(first)
    subscribeAssistant(second)
    sendToAssistant("hello")
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith("hello")
  })

  it("unsubscribe removes only the listener that owns the cleanup", () => {
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribeAssistant(first)
    subscribeAssistant(second)
    unsubscribeFirst()
    sendToAssistant("ping")
    expect(second).toHaveBeenCalledWith("ping")
  })
})
