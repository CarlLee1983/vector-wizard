import { Wizard } from "@/features/spec-wizard/components/Wizard"
import { I18nProvider } from "@/features/spec-wizard/i18n/I18nContext"

export default function Home() {
  return (
    <I18nProvider>
      <main className="app-shell">
        <Wizard />
      </main>
    </I18nProvider>
  )
}
