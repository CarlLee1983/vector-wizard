"use client"

import { useState } from "react"
import { useI18n } from "../i18n/I18nContext"
import { AssistantPanel } from "./AssistantPanel"
import { AutosaveErrorToast } from "./AutosaveErrorToast"
import { DraftManagerModal } from "./DraftManagerModal"
import { DraftSwitcher } from "./DraftSwitcher"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { StagedImportToast } from "./StagedImportToast"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const [managerOpen, setManagerOpen] = useState(false)

  return (
    <div className="app-shell">
      <div className="stack">
        <header>
          <div>
            <h1>{t("wizard.title")}</h1>
            <p>{t("wizard.subtitle")}</p>
          </div>
          <div className="header-actions">
            <DraftSwitcher onOpenManager={() => setManagerOpen(true)} />
            <LanguageSwitcher />
          </div>
        </header>

        <main>{children}</main>

        <DraftManagerModal open={managerOpen} onClose={() => setManagerOpen(false)} />
        <AutosaveErrorToast />
        <StagedImportToast />
      </div>
      <AssistantPanel />
    </div>
  )
}
