import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { I18nProvider, useI18n } from "../i18n/I18nContext"
import { dictionaries } from "../i18n/dictionaries"

function Probe() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div>
      <p>{locale}</p>
      <p>{t("wizard.title")}</p>
      <button onClick={() => setLocale("en")}>English</button>
    </div>
  )
}

describe("I18nProvider", () => {
  it("renders Traditional Chinese by default and switches to English", async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    )

    expect(screen.getByText("敏捷開發路徑 Wizard")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "English" }))

    expect(screen.getByText("Agile Roadmap Wizard")).toBeInTheDocument()
  })
})

describe("AI review prompt UI keys", () => {
  const uiKeys = [
    "reviewPrompt.section.title",
    "reviewPrompt.section.description",
    "reviewPrompt.button.idle",
    "reviewPrompt.button.copied",
    "reviewPrompt.button.failed",
    "reviewPrompt.fallback.label"
  ] as const

  it("provides zh-TW translations for every UI key", () => {
    for (const key of uiKeys) {
      expect(dictionaries["zh-TW"][key]).toBeTruthy()
    }
  })

  it("provides en translations for every UI key", () => {
    for (const key of uiKeys) {
      expect(dictionaries.en[key]).toBeTruthy()
    }
  })

  it("uses distinct strings per locale for the section title", () => {
    expect(dictionaries["zh-TW"]["reviewPrompt.section.title"]).not.toEqual(
      dictionaries.en["reviewPrompt.section.title"]
    )
  })
})

describe("AI review prompt template", () => {
  it("zh-TW template contains the 6 dimension headings and placeholders", () => {
    const t = dictionaries["zh-TW"]["reviewPrompt.template"]
    expect(t).toContain("目標清晰度")
    expect(t).toContain("使用者故事完整性")
    expect(t).toContain("驗收條件可測性")
    expect(t).toContain("範例邊界涵蓋")
    expect(t).toContain("Agent 邊界充分性")
    expect(t).toContain("區段間一致性")
    expect(t).toContain("{{summary_markdown}}")
    expect(t).toContain("{{yaml_content}}")
  })

  it("en template contains the 6 dimension headings and placeholders", () => {
    const t = dictionaries.en["reviewPrompt.template"]
    expect(t).toContain("Goal clarity")
    expect(t).toContain("Story completeness")
    expect(t).toContain("Acceptance criteria testability")
    expect(t).toContain("Example coverage")
    expect(t).toContain("Agent boundary sufficiency")
    expect(t).toContain("Cross-section consistency")
    expect(t).toContain("{{summary_markdown}}")
    expect(t).toContain("{{yaml_content}}")
  })
})
