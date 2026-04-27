"use client"

import { AppShell } from "@/features/spec-wizard/components/AppShell"
import { EmptyDraftState } from "@/features/spec-wizard/components/EmptyDraftState"
import { Wizard } from "@/features/spec-wizard/components/Wizard"
import { useDraftStore } from "@/features/spec-wizard/hooks/useDraftStore"
import { I18nProvider } from "@/features/spec-wizard/i18n/I18nContext"

function Body() {
  const { activeDraftId } = useDraftStore()
  return activeDraftId ? <Wizard /> : <EmptyDraftState />
}

export default function Home() {
  return (
    <I18nProvider>
      <AppShell>
        <Body />
      </AppShell>
    </I18nProvider>
  )
}
