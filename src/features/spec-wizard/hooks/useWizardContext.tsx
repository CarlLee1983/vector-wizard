"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { FeatureDraft } from "../model/specTypes"
import type { ActionStepId } from "../services/localAgent/actionRegistry"

export type WizardContextValue = {
  currentStepId: ActionStepId
  activeDraft: FeatureDraft | null
}

const WizardContext = createContext<WizardContextValue | null>(null)

export type WizardContextProviderProps = WizardContextValue & {
  children: ReactNode
}

export function WizardContextProvider({ currentStepId, activeDraft, children }: WizardContextProviderProps) {
  return <WizardContext.Provider value={{ currentStepId, activeDraft }}>{children}</WizardContext.Provider>
}

export function useWizardContext(): WizardContextValue {
  const value = useContext(WizardContext)
  if (!value) {
    throw new Error("useWizardContext must be used inside WizardContextProvider")
  }
  return value
}
