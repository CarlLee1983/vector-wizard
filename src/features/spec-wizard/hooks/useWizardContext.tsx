"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { FeatureDraft } from "../model/specTypes"
import type { ActionStepId } from "../services/localAgent/actionRegistry"
import type { ActionResult } from "../services/localAgent/actionResult"

export type StackItem = {
  id: number
  result: ActionResult
}

export type WizardContextValue = {
  currentStepId: ActionStepId
  activeDraft: FeatureDraft | null
  assistantStack: StackItem[]
  pushAssistantItem: (result: ActionResult) => void
  removeAssistantItem: (id: number) => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

const STACK_LIMIT = 5
let nextStackId = 1

export type WizardContextProviderProps = {
  currentStepId: ActionStepId
  activeDraft: FeatureDraft | null
  children: ReactNode
}

export function WizardContextProvider({ currentStepId, activeDraft, children }: WizardContextProviderProps) {
  const [assistantStack, setAssistantStack] = useState<StackItem[]>([])

  const pushAssistantItem = useCallback((result: ActionResult) => {
    setAssistantStack((prev) => {
      const next = [...prev, { id: nextStackId++, result }]
      if (next.length > STACK_LIMIT) next.splice(0, next.length - STACK_LIMIT)
      return next
    })
  }, [])

  const removeAssistantItem = useCallback((id: number) => {
    setAssistantStack((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return (
    <WizardContext.Provider
      value={{
        currentStepId,
        activeDraft,
        assistantStack,
        pushAssistantItem,
        removeAssistantItem
      }}
    >
      {children}
    </WizardContext.Provider>
  )
}

export function useWizardContext(): WizardContextValue {
  const value = useContext(WizardContext)
  if (!value) {
    throw new Error("useWizardContext must be used inside WizardContextProvider")
  }
  return value
}
