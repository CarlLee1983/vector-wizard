import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { ReviewPanel } from "../components/ReviewPanel";
import { minimalValidDraft } from "../test/fixtures";
import { buildReviewPrompt } from "../services/reviewPromptBuilder";
import { buildHumanSummary } from "../services/summary";
import { draftToYaml } from "../services/yamlSerializer";

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

describe("ReviewPanel — clipboard success flow", () => {
  it("copies the assembled prompt to clipboard and toggles to copied label", async () => {
    const user = userEvent.setup();
    renderPanel();

    const button = screen.getByRole("button", { name: "複製 AI 審閱 prompt" });
    await user.click(button);

    const draft = minimalValidDraft();
    const expected = buildReviewPrompt({
      yaml: draftToYaml(draft),
      summary: buildHumanSummary(draft),
      locale: draft.metadata.locale
    });
    expect(await navigator.clipboard.readText()).toBe(expected);
    expect(await screen.findByRole("button", { name: "已複製 ✓" })).toBeInTheDocument();
  });

  it("reverts the button label after 2 seconds", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "複製 AI 審閱 prompt" }));
    expect(await screen.findByRole("button", { name: "已複製 ✓" })).toBeInTheDocument();

    const revertCall = setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === 2000
    );
    expect(revertCall, "expected a setTimeout(..., 2000) call").toBeDefined();
    const revertCallback = revertCall![0] as () => void;

    await act(async () => {
      revertCallback();
    });

    expect(screen.getByRole("button", { name: "複製 AI 審閱 prompt" })).toBeInTheDocument();
    setTimeoutSpy.mockRestore();
  });
});

describe("ReviewPanel — clipboard failure flow", () => {
  function setupFailingClipboard() {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
      writable: true
    });
  }

  it("shows the failure label and reveals the fallback textarea with prompt content", async () => {
    const user = userEvent.setup();
    renderPanel();
    setupFailingClipboard();

    await user.click(screen.getByRole("button", { name: "複製 AI 審閱 prompt" }));

    expect(
      await screen.findByRole("button", { name: "複製失敗，請手動複製" })
    ).toBeInTheDocument();

    const textarea = screen.getByLabelText("Prompt 內容（可手動全選複製）") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.readOnly).toBe(true);

    const draft = minimalValidDraft();
    const expected = buildReviewPrompt({
      yaml: draftToYaml(draft),
      summary: buildHumanSummary(draft),
      locale: draft.metadata.locale
    });
    expect(textarea.value).toBe(expected);
  });

  it("does not render the fallback textarea before any copy attempt", () => {
    renderPanel();
    expect(screen.queryByLabelText("Prompt 內容（可手動全選複製）")).not.toBeInTheDocument();
  });
});
