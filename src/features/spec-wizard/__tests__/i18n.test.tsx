import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "../i18n/I18nContext";

function Probe() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <p>{locale}</p>
      <p>{t("wizard.title")}</p>
      <button onClick={() => setLocale("en")}>English</button>
    </div>
  );
}

describe("I18nProvider", () => {
  it("renders Traditional Chinese by default and switches to English", async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByText("敏捷開發路徑 Wizard")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByText("Agile Roadmap Wizard")).toBeInTheDocument();
  });
});
