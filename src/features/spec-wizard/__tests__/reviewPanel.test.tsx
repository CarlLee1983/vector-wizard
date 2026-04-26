import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { ReviewPanel } from "../components/ReviewPanel";
import { minimalValidDraft } from "../test/fixtures";

function renderPanel() {
  return render(
    <I18nProvider>
      <ReviewPanel draft={minimalValidDraft()} />
    </I18nProvider>
  );
}

describe("ReviewPanel — AI 審閱協助 section", () => {
  it("renders the section title, description and copy button", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "AI 審閱協助" })).toBeInTheDocument();
    expect(screen.getByText(/複製後可貼到 Claude Code/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "複製 AI 審閱 prompt" })).toBeInTheDocument();
  });
});
